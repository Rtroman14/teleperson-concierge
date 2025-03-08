import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const getSummaryPrompt = ({ text }) => `
Summarize the following document into 1-5 chunks, each chunk being approximately 300-500 characters in length. Focus on extracting the core themes and key information within each section. Ensure the summaries are concise, clear, and accurately reflect the original document's content.

DOCUMENT:
<document>
${text}
</document>
`;

export const summarizeWebPage = async ({ docs, text, pipe }) => {
    try {
        const google = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_AI_API_KEY_WEBAGENT,
        });

        const { object } = await generateObject({
            model: google("gemini-2.0-flash-001"),
            temperature: 0,
            schema: z.object({
                summaries: z.array(z.string()),
            }),
            prompt: getSummaryPrompt({ text }),
        });

        // Create new docs from summaries with embeddings
        const summaryDocs = await Promise.all(
            object.summaries.map(async (summary) => {
                const output = await pipe(summary, {
                    pooling: "mean",
                    normalize: true,
                });

                // Use metadata from the first doc as a base
                const baseDoc = docs[0];
                return {
                    ...baseDoc,
                    content: summary,
                    embedding: Array.from(output.data),
                };
            })
        );

        return summaryDocs;
    } catch (error) {
        console.error("Error in summarizeChunks:", error);
        return []; // Return empty array if process fails
    }
};
