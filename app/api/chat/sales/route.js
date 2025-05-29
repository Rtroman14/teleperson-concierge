import { createOpenAI } from "@ai-sdk/openai";
import {
    streamText,
    createDataStreamResponse,
    smoothStream,
    experimental_createMCPClient,
} from "ai";
import { format } from "date-fns";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/admin";
import { rateLimiting } from "@/lib/rateLimit";
import slackNotification from "@/lib/slackNotification";
import _ from "@/lib/Helpers";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { saveChat, saveConversationSales, findRelevantContent } from "@/lib/chat-helpers";
import { chatTools } from "@/lib/chat-tools";
import { geolocation } from "@vercel/functions";

import { Langfuse } from "langfuse";

// Initialize the Langfuse client
const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASEURL,
});

// Allow streaming responses up to 120 seconds
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req) {
    const body = await req.json();

    const location = geolocation(req);
    console.log(`location -->`, location);

    let { messages, conversationID, chatbotSettings } = body;

    const chatbotID = "e5f6ee19-c047-4391-81d0-ca3af5e9af8e";
    const userQuestion = messages[messages.length - 1].content;
    let currentConversationID = conversationID;

    // const systemMessage = chatbotSettings.chatbots.prompt;

    // * grok-3 prompt engineering --> https://grok.com/chat/1204bc27-69c4-4e81-ad0f-9ce6936ac317

    try {
        const supabase = await createClient();

        const today = format(new Date(), "EEEE, MMMM do, yyyy");

        const prompt = await langfuse.getPrompt("sales-chatbot-text");
        const systemMessage = prompt.compile({
            today,
        });

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

        let knowledgeBase = { content: "", sources: [], messageSources: [] };
        let rephrasedInquiry = userQuestion;

        // const mcpServerUrl = "https://aa2e-2601-280-5c00-7d80-5cf3-b53f-66df-8edc.ngrok-free.app";
        const mcpServerUrl = process.env.MCP_SERVER_DOMAIN;

        const mcpClientBooking = await experimental_createMCPClient({
            transport: {
                type: "sse",
                url: `${mcpServerUrl}/booking/sse`,
            },
        });
        const mcpClientWebsite = await experimental_createMCPClient({
            transport: {
                type: "sse",
                url: `${mcpServerUrl}/website/sse`,
            },
        });

        const mcpBookingTools = await mcpClientBooking.tools();
        const mcpWebsiteTools = await mcpClientWebsite.tools();

        const allTools = {
            ...mcpBookingTools,
            ...mcpWebsiteTools,
            ...chatTools,
        };

        // Return data stream response with annotations and status updates
        return createDataStreamResponse({
            execute: async (dataStream) => {
                const result = streamText({
                    model: openai("gpt-4o"),
                    system: systemMessage,
                    messages,
                    maxSteps: 4,
                    maxTokens: 1500,
                    temperature: 0.2,
                    experimental_transform: smoothStream({
                        delayInMs: 20, // optional: defaults to 10ms
                    }),
                    tools: allTools,
                    experimental_telemetry: {
                        isEnabled: true,
                        functionId: "sales-chatbot",
                        metadata: {},
                    },
                    onStepFinish: async ({ toolCalls, toolResults }) => {
                        // console.log(`toolCalls -->`, toolCalls);
                        // console.log(`toolResults -->`, toolResults);
                    },
                    async onFinish({ text, toolCalls }) {
                        await mcpClientBooking.close();
                        await mcpClientWebsite.close();

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
                    onError: async ({ error }) => {
                        console.log(`error -->`, error);

                        await mcpClientBooking.close();
                        await mcpClientWebsite.close();
                    },
                });

                // Merge the stream text result into the data stream
                result.mergeIntoDataStream(dataStream);
            },
            onError: async (error) => {
                console.log(`error -->`, error);
                await mcpClientBooking.close();
                await mcpClientWebsite.close();
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
