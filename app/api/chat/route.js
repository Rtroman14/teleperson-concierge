import { createOpenAI } from "@ai-sdk/openai";
import {
    streamText,
    createDataStreamResponse,
    smoothStream,
    tool,
    generateText,
    experimental_createMCPClient,
} from "ai";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/admin";
import { rateLimiting } from "@/lib/rateLimit";
import slackNotification from "@/lib/slackNotification";
import _ from "@/lib/Helpers";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { Langfuse } from "langfuse";
import { format } from "date-fns";

import {
    saveChat,
    saveConversation,
    findRelevantContent,
    incrementMessagesSent,
} from "@/lib/chat-helpers";

// Allow streaming responses up to 120 seconds
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Initialize Langfuse client
const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASEURL,
});

export async function POST(req) {
    const body = await req.json();

    let { messages, conversationID, telepersonUser, previousConversations } = body;

    const chatbotID = "fb0b48ba-9449-4e83-bc51-43e2651e3e16";
    const userQuestion = messages[messages.length - 1].content;
    let currentConversationID = conversationID;

    let vendors = telepersonUser.vendors || [];

    try {
        const supabase = await createClient();

        // Rate limiting check
        // const getHeaders = headers();
        // const { success: rateLimitSuccess } = await rateLimiting({
        //     headers: getHeaders,
        //     fallbackIdentifer: conversationID ?? telepersonUser.id,
        //     maxRequests: 20,
        //     window: 120,
        // });

        // if (!rateLimitSuccess) {
        //     throw new Error("Rate limit exceeded. Please try again in a few minutes.");
        // }

        // let { prompt: system, team_id: team } = chatbotSettings;
        // const numMessagesAllowed = team.num_messages_extra + team.prod_id.num_messages;
        // const teamHasKey = _.teamHasKey(team);

        // // * return if chatbot exceeded num messages allowed && team didn't provide key
        // if (team.messages_sent >= numMessagesAllowed && !teamHasKey) {
        //     throw new Error(
        //         "I apologize, but I've reached my conversation limit for the month and can't respond to new messages right now. Your interest is important to us, and we'd love to answer your questions soon."
        //     );
        // }

        const openai = createOpenAI({
            compatibility: "strict",
            apiKey: process.env.OPENAI_API_KEY,
        });

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_AI_API_KEY,
        });

        let knowledgeBase = { content: "", sources: [], messageSources: [] };
        let rephrasedInquiry = userQuestion;

        // Load and compile the Langfuse prompt
        const prompt = await langfuse.getPrompt("vendor-chatbot-text");
        const systemMessage = prompt.compile({
            firstName: telepersonUser.firstName,
            email: telepersonUser.email,
            today: format(new Date(), "EEEE, MMMM do, yyyy"),
            numVendors: vendors.length,
            vendorNames: vendors.map((vendor) => `- ${vendor}`).join("\n"),
            pastConversations: previousConversations,
        });

        const mcpClientVendor = await experimental_createMCPClient({
            transport: {
                type: "sse",
                url: `${process.env.MCP_SERVER_DOMAIN}/vendor/sse`,
            },
        });

        const mcpVendorTools = await mcpClientVendor.tools();

        // Return data stream response with annotations and status updates
        return createDataStreamResponse({
            execute: async (dataStream) => {
                const result = streamText({
                    model: openai("gpt-4o-mini"),
                    // model: openai("gpt-4o"),
                    // model: google("gemini-2.0-flash-001"),
                    system: systemMessage,
                    messages,
                    maxSteps: 5,
                    maxTokens: 1500,
                    temperature: 0.2,
                    experimental_transform: smoothStream({
                        delayInMs: 10, // optional: defaults to 10ms
                    }),
                    tools: {
                        getInformation: tool({
                            description:
                                "Retrieve detailed information from your knowledge base for vendor-specific queries.",
                            parameters: z.object({
                                question: z.string().describe("the user's question"),
                                vendorName: z
                                    .enum(vendors)
                                    .describe("the name of the vendor the user is asking about"),
                            }),
                            execute: async ({ question, vendorName }) => {
                                rephrasedInquiry = question;
                                knowledgeBase = await findRelevantContent({
                                    supabase,
                                    question,
                                    vendorName,
                                });
                                if (knowledgeBase.content !== "") {
                                    const { text } = await generateText({
                                        model: google("gemini-2.0-flash-001"),
                                        maxTokens: 1500,
                                        temperature: 0.3,
                                        system: `
                                        You are a content extraction assistant for ${vendorName}-related queries. Provide detailed and comprehensive information that directly pertains to the user's question.
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
                        ...mcpVendorTools,
                        // getUsersVendors: tool({
                        //     description:
                        //         "Get a list of vendors and their descriptions from the user's vendor hub.",
                        //     parameters: z.object({}),
                        //     execute: async () => {
                        //         console.log("getUsersVendors");
                        //         if (!telepersonUser || !telepersonUser.id) {
                        //             return "No user information available.";
                        //         }
                        //         const vendorsResult = await TelepersonAPIs.fetchVendorsByUserId(
                        //             telepersonUser.id
                        //         );

                        //         if (!vendorsResult.success) {
                        //             return "Unable to retrieve vendor information at this time.";
                        //         }
                        //         if (vendorsResult.data.length === 0) {
                        //             return "The user doesn't have any vendors in their hub.";
                        //         }

                        //         const vendorHub = vendorsResult.data.map(({ id, ...rest }) => rest);

                        //         // let vendorHub = [...vendorNames, ...testVendors];

                        //         return `
                        //         The user has the following vendors (${
                        //             vendorHub.length
                        //         }) in their hub:
                        //         """
                        //         ${JSON.stringify(vendorHub, null, 4)}
                        //         """`;
                        //     },
                        // }),
                        // getUserTransactions: tool({
                        //     description: "Get a list of the user's recent transactions.",
                        //     parameters: z.object({}),
                        //     execute: async () => {
                        //         if (!telepersonUser || !telepersonUser.id) {
                        //             return "No user information available.";
                        //         }
                        //         const transactions = await TelepersonAPIs.fetchTransactions(
                        //             telepersonUser.id
                        //         );
                        //         if (!transactions.success) {
                        //             return "Unable to retrieve transaction information at this time.";
                        //         }
                        //         if (!transactions.data || transactions.data.length === 0) {
                        //             return "No transactions found for this user.";
                        //         }
                        //         const formattedTransactions = transactions.data
                        //             .map((tx) => {
                        //                 const date = new Date(tx.transactedAt).toLocaleDateString();
                        //                 return `- ${date}: ${tx.description} - $${tx.amount} (${tx.type}) [${tx.category}]`;
                        //             })
                        //             .join("\n");

                        //         return `Here are your recent transactions:\n${formattedTransactions}`;
                        //     },
                        // }),
                    },
                    experimental_telemetry: {
                        isEnabled: true,
                        functionId: "vendor-chatbot",
                        metadata: {},
                    },
                    async onFinish({ text }) {
                        // Add sources to annotations if they exist
                        if (knowledgeBase?.sources.length > 0) {
                            dataStream.writeMessageAnnotation({ sources: knowledgeBase.sources });
                        }

                        try {
                            // Save conversation and message history
                            if (!currentConversationID) {
                                // * save new conversation + preview message && return conversation.id
                                const savedConversation = await saveConversation({
                                    supabase,
                                    userQuestion,
                                    telepersonUser,
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
                    async onStepFinish({ toolCalls, toolResults }) {
                        console.log("onStepFinish");

                        console.log({ toolCalls });
                        console.log({ toolResults });
                    },
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
            model: google("gemini-2.0-flash-001"),
            prompt: `Respond to the user with "${message}"`,
            experimental_transform: smoothStream({
                delayInMs: 20, // optional: defaults to 10ms
            }),
        });

        return result.toDataStreamResponse();
    }
}
