import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/admin";
import { rateLimiting } from "@/lib/rateLimit";
import slackNotification from "@/lib/slackNotification";
import ChatModel from "@/lib/chat-model";
import _ from "@/lib/Helpers";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { findRelevantContent } from "@/lib/chat-helpers";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const system = `
## Context:
You are the AI-powered Concierge for Teleperson, tasked with providing independent, third-party customer service and support for users accessing their Vendor Hub. Your role is distinct from any individual vendor and your objective is to offer neutral, explanatory, and helpful guidance whenever a user asks about the vendors within their hub. Your knowledge base includes detailed information about Teleperson and the vendors associated with their Vendor Hub.

This knowledge base is your reference; however, your primary goal is to guide the user with clear and objective instructions, avoiding vendor-biased statements.

## Core Function:
As an independent Concierge, your main objective is to inform, clarify, and provide step-by-step instructions or general assistance related to managing vendor accounts, navigating vendor services, or finding relevant resources. Your responses should be explanatory, offering actionable steps that empower the user to independently manage their accounts and resolve issues.

## Identity and Boundaries:
You are the Teleperson Concierge—a neutral, professional, and third-party customer service assistant. When handling inquiries about any vendor in the user's Vendor Hub:
- Respond independently, focusing on practical, clear guidance.
- Refrain from using vendor-specific claims or language (e.g., "we believe").
- Offer detailed and instructive answers such as "TruStage does X. To do this, please follow these steps…"
- Ensure that your tone remains consistent as an independent advisor rather than a representative of any vendor.

## Guidelines:
1. **Confidentiality**: Do not mention or reference your underlying knowledge base.
2. **Neutral and Explanatory Tone**: Provide clear, detailed, and neutral responses that guide the user.
3. **Staying On Topic**: If the conversation deviates from Teleperson and vendor-related inquiries, gently steer it back.
4. **Complete Direct Support**: Provide all necessary information directly in your response without instructing the user to visit external websites or contact vendor support.
5. **Fallback Response**: "I apologize, but I don't have specific information about [user's query]. However, I'd be happy to assist you with any questions related to Teleperson or vendor support within your Vendor Hub."

## Speaking Instructions:
- Optimize your response for spoken communication: make it natural, conversational, and easy to understand when read aloud.
- Do not use markdown formatting or any markdown syntax in your response. Provide your answer in plain, spoken language.
`;

export async function POST(req) {
    const body = await req.json();

    if (body.message.type !== "tool-calls") {
        return;
    }

    // Extract tool call information
    const toolCall = body.message.toolCalls[0];
    const { vendor_name, user_question } = toolCall.function.arguments;
    const toolCallId = toolCall.id;

    console.log(`toolCall.function.arguments -->`, toolCall.function.arguments);

    console.log(`body.message.toolCalls -->`, body.message.toolCalls);

    // Create conversation history from messagesOpenAIFormatted
    const conversationHistory = body.message.artifact.messagesOpenAIFormatted
        .filter((msg) => (msg.role === "user" || msg.role === "assistant") && !msg.tool_calls)
        .slice(0, -1); // Remove the last message

    const chatbotID = "fb0b48ba-9449-4e83-bc51-43e2651e3e16";
    const userQuestion = user_question;

    let telepersonUser = {
        id: "123",
        name: "Jesse Hollander",
        vendors: ["Home Depot", "Costco", "Target", "US Bank"],
    };

    try {
        const supabase = await createClient();

        // Rate limiting check
        const getHeaders = headers();
        const { success: rateLimitSuccess } = await rateLimiting({
            headers: getHeaders,
            fallbackIdentifer: telepersonUser?.id || "default",
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

        console.time("Find Relevant Content");
        const knowledgeBase = await findRelevantContent({
            question: user_question,
            chatbotID,
            supabase,
            vendorName: vendor_name,
        });
        console.timeEnd("Find Relevant Content");

        // Add knowledge base to last user message
        let messagesWithKnowledgeBase = [...conversationHistory];
        messagesWithKnowledgeBase.push({
            role: "user",
            content: `
Knowledge base: """${knowledgeBase.content}"""

User's question: ${user_question}
            `,
        });

        const chatModelInstance = new ChatModel({
            apiKey: process.env.GOOGLE_AI_API_KEY,
            temperature: 0,
            // model: openai("gpt-4o"),
            model: google("gemini-2.0-flash-001"),
            supabase,
        });

        // * ---------------------------- MAIN AGENT ---------------------------- //
        console.time("Main Agent Response");
        const mainAgentResponse = await chatModelInstance.generateResponse({
            system,
            messages: messagesWithKnowledgeBase,
        });
        console.timeEnd("Main Agent Response");

        if (mainAgentResponse.success) {
            const results = {
                results: [
                    {
                        toolCallId: toolCallId,
                        result: mainAgentResponse.data.response,
                    },
                ],
            };

            console.log(`results -->`, results);

            return NextResponse.json(results);
        }

        // * ---------------------------- FACT CHECKER ---------------------------- //
        const systemForImprovedAnswer = `
You are a fact-checking assistant.
Your job is to verify the factual accuracy of the provided AI response against the given knowledge base.
If the response is fully supported by the knowledge base, return it exactly as it is.
If there are any inaccuracies or unsupported details, correct them strictly using only the information provided in the knowledge base.
Output only the final, validated response without any explanations or extra commentary.
`;

        const prompt = `
Knowledge base: """${knowledgeBase.content}"""

User's question: """${userQuestion}"""

Original response: """${mainAgentResponse.data.response}"""`;

        // * ---------------------------- MAIN AGENT ---------------------------- //
        console.time("Improve Response Agent");
        const improvedResponse = await chatModelInstance.generateResponse({
            system: systemForImprovedAnswer,
            prompt,
            // model: openai("gpt-4o-mini"),
        });
        console.timeEnd("Improve Response Agent");

        console.log(`\nmainAgentResponse.data.response -->`, mainAgentResponse.data.response);

        if (!improvedResponse.success) {
            return NextResponse.json({
                success: false,
                data: mainAgentResponse.data.response,
                message: improvedResponse.message,
            });
        }

        return NextResponse.json({
            results: [
                {
                    toolCallId: toolCallId,
                    result: improvedResponse.data.response,
                },
            ],
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

        // Add proper error response
        return NextResponse.json({
            results: [
                {
                    toolCallId: toolCallId,
                    result: message,
                },
            ],
        });
    }
}
