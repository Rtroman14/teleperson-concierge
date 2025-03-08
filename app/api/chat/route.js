import { createOpenAI } from "@ai-sdk/openai";
import { streamText, createDataStreamResponse, smoothStream, tool, generateText } from "ai";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/admin";
import { rateLimiting } from "@/lib/rateLimit";
import slackNotification from "@/lib/slackNotification";
import _ from "@/lib/Helpers";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

import {
    saveChat,
    saveConversation,
    findRelevantContent,
    incrementMessagesSent,
} from "@/lib/chat-helpers";
import TelepersonAPIs from "@/lib/teleperson-apis";

// Allow streaming responses up to 120 seconds
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req) {
    const body = await req.json();

    let { messages, conversationID, telepersonUser } = body;

    // console.log(`telepersonUser -->`, telepersonUser);
    const chatbotID = "fb0b48ba-9449-4e83-bc51-43e2651e3e16";
    const userQuestion = messages[messages.length - 1].content;
    let currentConversationID = conversationID;

    let vendors = telepersonUser.vendors || [];
    const testVendors = ["TruStage", "Teleperson", "UW Credit Union", "Badger Meter"];
    vendors = [...vendors, ...testVendors];

    try {
        const supabase = await createClient();

        // Rate limiting check
        const getHeaders = headers();
        const { success: rateLimitSuccess } = await rateLimiting({
            headers: getHeaders,
            fallbackIdentifer: conversationID ?? telepersonUser.id,
            maxRequests: 20,
            window: 120,
        });

        if (!rateLimitSuccess) {
            throw new Error("Rate limit exceeded. Please try again in a few minutes.");
        }

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
        let rephrasedInquiry = { data: userQuestion };

        // Return data stream response with annotations and status updates
        return createDataStreamResponse({
            execute: async (dataStream) => {
                const result = streamText({
                    // model: openai("gpt-4o"),
                    model: google("gemini-2.0-flash-001"),
                    system: `
## Context:
You are Teleperson's AI-powered Concierge, a neutral and independent assistant dedicated to offering unbiased, clear, and helpful guidance to users regarding vendors in their Vendor Hub. Your role is to support users in navigating vendor services, managing vendor accounts, and accessing relevant resources within Teleperson's platform.

You are currently assisting ${
                        telepersonUser.firstName
                    }. Ensure your responses are personalized and directly address the user's inquiry.

## Vendors (${vendors.length}) in ${telepersonUser.firstName}'s Vendor Hub:
${vendors.map((vendor) => `- ${vendor}`).join("\n")}

## Core Function:
- Provide practical, step-by-step instructions and general assistance for vendor-related inquiries.
- Deliver actionable information that empowers the user to manage their vendor relationships effectively.

## Identity and Boundaries:
You are the Teleperson Concierge—a neutral, professional, and independent customer service assistant.
- Respond with clear and factual information.
- Avoid vendor-specific biased language (e.g., "we believe"), and ensure your tone remains independent.
- Provide detailed and instructive guidance such as: "TruStage does X. To accomplish this, please follow these steps…"

## Guidelines:
1. **Confidentiality**: Do not reference or disclose your internal knowledge base.
2. **Neutral Tone**: Maintain a balanced, clear, and informative tone.
3. **Stay Focused**: Keep your responses relevant to Teleperson and vendors in the Vendor Hub.
4. **Formatting**: Use markdown formatting, lists, and clear sections to organize your response.
5. **Direct Support**: Provide all necessary information directly in your answer.
6. **Avoid Repetition**: Do not repeat phrases or examples across multiple responses.
7. **Tool Invocation Requirement**: Always invoke the **getInformation** tool when the user's question includes detailed vendor-specific queries. Do not respond with generic statements if the inquiry requires precise data.
8. **Fallback**: If you cannot provide specific information, respond with:  
   "I apologize, but I don't have specific information about [user's query]. However, I'd be happy to assist you with any questions related to Teleperson or vendor support within your Vendor Hub."
9. **User Address**: Avoid using the user's name in every message.

## Available Tools:
### getInformation
- **Description**: Retrieves detailed information from your knowledge base for vendor-specific queries.
- **When to Use**: Invoke this tool when the user's question involves specific details about a vendor (for example, features, policies, or leadership information).
- **Parameters**:
    - \`question\` (string): The user's detailed inquiry.
    - \`vendorName\` (enum): The vendor's name (must be one of the vendors in the user's Vendor Hub).

### getUsersVendors
- **Description**: Fetches an up-to-date list of vendors along with their descriptions from the user's Vendor Hub.
- **When to Use**: Use this tool when the user asks questions such as "What vendors do I have?" or similar queries requesting an overview of their vendors.

### getUserTransactions
- **Description**: Retrieves the user's recent transactions, including details like date, amount, description, and transaction type.
- **When to Use**: Call this tool when the user inquires about their payment history, transaction details, or financial activities.
    `,
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
                                rephrasedInquiry = { data: question };
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
                        getUsersVendors: tool({
                            description:
                                "Get a list of vendors and their descriptions from the user's vendor hub.",
                            parameters: z.object({}),
                            execute: async () => {
                                console.log("getUsersVendors");
                                if (!telepersonUser || !telepersonUser.id) {
                                    return "No user information available.";
                                }
                                const vendorsResult = await TelepersonAPIs.fetchVendorsByUserId(
                                    telepersonUser.id
                                );

                                if (!vendorsResult.success) {
                                    return "Unable to retrieve vendor information at this time.";
                                }
                                if (vendorsResult.data.length === 0) {
                                    return "The user doesn't have any vendors in their hub.";
                                }

                                const vendorHub = vendorsResult.data.map(({ id, ...rest }) => rest);

                                // let vendorHub = [...vendorNames, ...testVendors];

                                return `
                                The user has the following vendors (${
                                    vendorHub.length
                                }) in their hub:
                                """
                                ${JSON.stringify(vendorHub, null, 4)}
                                """`;
                            },
                        }),
                        getUserTransactions: tool({
                            description: "Get a list of the user's recent transactions.",
                            parameters: z.object({}),
                            execute: async () => {
                                if (!telepersonUser || !telepersonUser.id) {
                                    return "No user information available.";
                                }
                                const transactions = await TelepersonAPIs.fetchTransactions(
                                    telepersonUser.id
                                );
                                if (!transactions.success) {
                                    return "Unable to retrieve transaction information at this time.";
                                }
                                if (!transactions.data || transactions.data.length === 0) {
                                    return "No transactions found for this user.";
                                }
                                const formattedTransactions = transactions.data
                                    .map((tx) => {
                                        const date = new Date(tx.transactedAt).toLocaleDateString();
                                        return `- ${date}: ${tx.description} - $${tx.amount} (${tx.type}) [${tx.category}]`;
                                    })
                                    .join("\n");

                                return `Here are your recent transactions:\n${formattedTransactions}`;
                            },
                        }),
                    },
                    async onFinish({ text }) {
                        console.log(`onFinish text -->`, text);
                        // Add sources to annotations if they exist
                        if (knowledgeBase?.sources.length > 0) {
                            dataStream.writeMessageAnnotation({ sources: knowledgeBase.sources });
                        }

                        try {
                            // Save conversation and message history
                            // if (!currentConversationID) {
                            //     // * save new conversation + preview message && return conversation.id
                            //     const savedConversation = await saveConversation({
                            //         supabase,
                            //         userQuestion,
                            //         contactID: telepersonUser?.id || null,
                            //     });

                            //     if (savedConversation.success) {
                            //         currentConversationID = savedConversation.data;
                            //     }

                            //     // Write completion annotation
                            //     if (!conversationID) {
                            //         dataStream.writeData({ conversationID: currentConversationID });
                            //     }
                            // }

                            if (currentConversationID) {
                                const allMessages = [
                                    ...messages.map(({ role, content }) => ({ role, content })),
                                    { role: "assistant", content: text },
                                ];

                                // const messagesToSave = await saveChat({
                                //     messages: allMessages,
                                //     conversationID: currentConversationID,
                                //     chatbotID,
                                //     rephrasedInquiry,
                                //     knowledgeBase,
                                //     openai,
                                //     supabase,
                                // });

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
            model: google("gemini-1.5-flash-8b"),
            prompt: `Respond to the user with "${message}"`,
            experimental_transform: smoothStream({
                delayInMs: 20, // optional: defaults to 10ms
            }),
        });

        return result.toDataStreamResponse();
    }
}
