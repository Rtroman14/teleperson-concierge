import { z } from "zod";
import { findRelevantContent } from "./chat-helpers";
import { createClient } from "@/lib/supabase/admin";
import { tool, generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const chatTools = {
    get_information: tool({
        description:
            "Retrieve detailed information from your knowledge base for teleperson-specific queries.",
        parameters: z.object({
            question: z.string().describe("the user's question"),
        }),
        execute: async ({ question }) => {
            const supabase = await createClient();

            const knowledgeBase = await findRelevantContent({
                supabase,
                question,
                vendorName: "Teleperson",
            });

            if (knowledgeBase.content !== "") {
                const google = createGoogleGenerativeAI({
                    apiKey: process.env.GOOGLE_AI_API_KEY,
                });

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

    book_meeting: tool({
        description: "Send the user a booking calendar to book a call or meeting",
        parameters: z.object({}),
        execute: async () => ({
            url: "https://cal.com/teleperson/30min",
        }),
    }),
};
