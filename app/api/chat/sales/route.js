import { createOpenAI } from "@ai-sdk/openai";
import { streamText, createDataStreamResponse, smoothStream, tool, generateText } from "ai";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/admin";
import { rateLimiting } from "@/lib/rateLimit";
import slackNotification from "@/lib/slackNotification";
import _ from "@/lib/Helpers";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

import { saveChat, saveConversationSales, findRelevantContent } from "@/lib/chat-helpers";
// import { salesSystemMessage } from "@/lib/agent-settings";

// Allow streaming responses up to 120 seconds
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req) {
    const body = await req.json();

    let { messages, conversationID, chatbotSettings } = body;

    const chatbotID = "e5f6ee19-c047-4391-81d0-ca3af5e9af8e";
    const userQuestion = messages[messages.length - 1].content;
    let currentConversationID = conversationID;

    const systemMessage = chatbotSettings.chatbots.prompt;

    try {
        const supabase = await createClient();

        // Rate limiting check
        const getHeaders = headers();
        const { success: rateLimitSuccess } = await rateLimiting({
            headers: getHeaders,
            fallbackIdentifer: conversationID ?? chatbotID,
            maxRequests: 20,
            window: 120,
        });

        if (!rateLimitSuccess) {
            throw new Error("Rate limit exceeded. Please try again in a few minutes.");
        }

        const openai = createOpenAI({
            compatibility: "strict",
            apiKey: process.env.OPENAI_API_KEY,
        });

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_AI_API_KEY,
        });

        let knowledgeBase = { content: "", sources: [], messageSources: [] };
        let rephrasedInquiry = userQuestion;

        // Return data stream response with annotations and status updates
        return createDataStreamResponse({
            execute: async (dataStream) => {
                const result = streamText({
                    model: openai("gpt-4o"),
                    // model: google("gemini-2.0-flash-001"),
                    system: systemMessage,
                    messages,
                    maxSteps: 3,
                    maxTokens: 1500,
                    temperature: 0.2,
                    experimental_transform: smoothStream({
                        delayInMs: 20, // optional: defaults to 10ms
                    }),
                    tools: {
                        getInformation: tool({
                            description:
                                "Retrieve detailed information from your knowledge base for teleperson-specific queries.",
                            parameters: z.object({
                                question: z.string().describe("the user's question"),
                            }),
                            execute: async ({ question }) => {
                                rephrasedInquiry = question;
                                knowledgeBase = await findRelevantContent({
                                    supabase,
                                    question,
                                    vendorName: "Teleperson",
                                });
                                if (knowledgeBase.content !== "") {
                                    const { text } = await generateText({
                                        model: google("gemini-2.0-flash-001"),
                                        maxTokens: 1500,
                                        temperature: 0.3,
                                        system: `
                                        You are a content extraction assistant for teleperson-related queries. Provide detailed and comprehensive information that directly pertains to the user's question.
                                        - Include all relevant details without introducing unnecessary verbosity.
                                    `,
                                        prompt: `
                                        User's Question:
                                        """${question}"""

                                        Knowledge Base Content:
                                        """${knowledgeBase.content}"""

                                        Please extract and return only the relevant and detailed information from the provided knowledge base that's pertinent to the user's question.
                                    `,
                                    });

                                    return `Knowledge base: <knowledge>${knowledgeBase.content}</knowledge> \n\n<verifiedAnswer>${text}</verifiedAnswer>`;
                                }
                                return knowledgeBase.content;
                            },
                        }),
                        bookCalendlyMeeting: tool({
                            description:
                                "Send the user a booking calendar to book a call or meeting",
                            parameters: z.object({}),
                            execute: async () => ({
                                url: "https://calendly.com/teleperson/teleperson-connect",
                            }),
                        }),
                    },
                    async onFinish({ text, toolCalls }) {
                        console.log(`toolCalls -->`, toolCalls);
                        // Add sources to annotations if they exist
                        if (knowledgeBase?.sources.length > 0) {
                            dataStream.writeMessageAnnotation({ sources: knowledgeBase.sources });
                        }

                        try {
                            // Save conversation and message history
                            if (!currentConversationID) {
                                // * save new conversation + preview message && return conversation.id
                                const savedConversation = await saveConversationSales({
                                    supabase,
                                    userQuestion,
                                    chatbotID,
                                });

                                if (savedConversation.success) {
                                    currentConversationID = savedConversation.data;
                                }

                                // Write completion annotation
                                if (!conversationID) {
                                    dataStream.writeData({ conversationID: currentConversationID });
                                }
                            }

                            if (currentConversationID) {
                                const allMessages = [
                                    ...messages.map(({ role, content }) => ({ role, content })),
                                    { role: "assistant", content: text },
                                ];

                                const messagesToSave = await saveChat({
                                    supabase,
                                    messages: allMessages,
                                    conversationID: currentConversationID,
                                    rephrasedInquiry,
                                });

                                // await incrementMessagesSent({
                                //     supabase,
                                //     team: { id: "90bfc6b8-a8ed-41e7-9ba7-e18bab6725a7" },
                                // });
                            }

                            // Prepare message annotations
                            const messageAnnotations = {
                                chatbotID,
                                conversationID: currentConversationID,
                                // vendor,
                            };

                            // Write the annotations to the data stream
                            dataStream.writeMessageAnnotation(messageAnnotations);
                        } catch (error) {
                            console.error("Error saving chat history:", error);
                            await slackNotification({
                                username: "Chat History Error",
                                text: JSON.stringify(error, null, 2),
                            });
                        }
                    },
                    // async onStepFinish({ toolCalls, toolResults }) {
                    //     console.log("onStepFinish");

                    //     console.log({ toolCalls });
                    //     console.log({ toolResults });
                    // },
                });

                // Merge the stream text result into the data stream
                result.mergeIntoDataStream(dataStream);
            },
            onError: (error) => {
                // Return user-friendly error message
                if (error == null) return "Unknown error";
                if (typeof error === "string") return error;
                if (error instanceof Error) return error.message;
                return JSON.stringify(error);
            },
        });
    } catch (error) {
        console.error(error);

        let message = "There was an internal error";
        if (error.message.includes("I apologize")) {
            message = error.message;
        } else {
            await slackNotification({
                username: "/api/chat/teleperson",
                text: JSON.stringify(error, null, 4),
            });
        }

        // const openai = createOpenAI({
        //     compatibility: "strict",
        //     apiKey: process.env.OPENAI_API_KEY,
        // });

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_AI_API_KEY,
        });

        const result = streamText({
            model: google("gemini-1.5-flash-8b"),
            prompt: `Respond to the user with "${message}"`,
            experimental_transform: smoothStream({
                delayInMs: 20, // optional: defaults to 10ms
            }),
        });

        return result.toDataStreamResponse();
    }
}
