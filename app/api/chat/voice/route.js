import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { headers } from "next/headers";
import { createClient } from "@/app/lib/supabase/admin";
import { rateLimiting } from "@/app/lib/rateLimit";
import slackNotification from "@/app/lib/slackNotification";
import ChatModel from "@/app/lib/chat/teleperson/ChatModel.Teleperson";
import _ from "@/app/lib/Helpers";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { findRelevantContent } from "@/app/lib/chat/teleperson/chatHelpers.Teleperson";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// https://adf2-2601-280-5c00-7d80-1800-b4ad-bc8c-b3d6.ngrok-free.app

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
    console.time("Total API Request Time");
    const body = await req.json();

    let { message, conversation_history, telepersonUser, vendor } = body;

    const chatbotID = "fb0b48ba-9449-4e83-bc51-43e2651e3e16";
    const userQuestion = message;

    telepersonUser = {
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
            fallbackIdentifer: telepersonUser.id,
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

        // * ---------------------------- REPHRASE INQUERY AGENT ---------------------------- //
        console.time("Rephrase Inquiry");
        const conversationString = conversation_history
            .slice(0, -1) // exclude the last message
            .slice(-4) // get last 4 messages from remaining history
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n");

        const chatModelInstance = new ChatModel({
            apiKey: process.env.GOOGLE_AI_API_KEY,
            temperature: 0,
            // model: openai("gpt-4o"),
            model: google("gemini-2.0-flash-001"),
            supabase,
        });

        const rephraseSystem = `
## Context:
You are a language model tasked with analyzing and correcting transcribed voice messages, ensuring each query has sufficient context and correct spelling. The user is discussing the vendor "${vendor}".

## Instructions:
1. Carefully read the user's transcribed message.
2. Correct any potential transcription errors or misspellings, including:
   - Common voice-to-text errors
   - Phonetic misspellings (e.g., "True Stage" should be "TruStage")
   - Grammatical errors from speech patterns
3. Assess whether the corrected query contains enough context:
   - If self-contained: Return the corrected version
   - If lacking context: Rephrase to include necessary context from the conversation

## Guidelines:
- Output only the corrected and/or rephrased query
- Maintain the original intent and meaning
- Do not add information not present in the conversation
- Focus on making the query clear and standalone
- Ensure proper spelling of "${vendor}" if mentioned
`;

        const rephrasedInquiry = await chatModelInstance.rephraseInquiryAgent({
            system: rephraseSystem,
            conversationString,
            inquiry: userQuestion,
            model: google("gemini-1.5-flash-8b"),
        });
        console.timeEnd("Rephrase Inquiry");

        console.log(`rephrasedInquiry.data -->`, rephrasedInquiry.data);

        console.time("Find Relevant Content");
        const knowledgeBase = await findRelevantContent({
            question: rephrasedInquiry.data,
            chatbotID,
            supabase,
            vendorName: vendor,
        });
        console.timeEnd("Find Relevant Content");

        // * add knowledge base to last user message
        let messagesWithKnowledgeBase = [...conversation_history];
        messagesWithKnowledgeBase = [
            ...messagesWithKnowledgeBase.slice(0, -1),
            {
                ...messagesWithKnowledgeBase[messagesWithKnowledgeBase.length - 1],
                content: `
Knowledge base: """${knowledgeBase.content}"""

User's question: ${userQuestion}
            `,
            },
        ];

        // * ---------------------------- MAIN AGENT ---------------------------- //
        console.time("Main Agent Response");
        const mainAgentResponse = await chatModelInstance.generateResponse({
            system,
            messages: messagesWithKnowledgeBase,
        });
        console.timeEnd("Main Agent Response");

        console.log(`\nmainAgentResponse.data.response -->`, mainAgentResponse.data.response);

        if (mainAgentResponse.success) {
            return NextResponse.json({
                success: true,
                data: mainAgentResponse.data.response,
            });
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

        console.timeEnd("Total API Request Time");

        // * ---------------------------- MAIN AGENT ---------------------------- //
        console.time("Improve Response Agent");
        const improvedResponse = await chatModelInstance.generateResponse({
            system: systemForImprovedAnswer,
            prompt,
            model: openai("gpt-4o-mini"),
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
            success: true,
            data: improvedResponse.data.response,
        });
    } catch (error) {
        console.timeEnd("Total API Request Time");
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
    }
}
