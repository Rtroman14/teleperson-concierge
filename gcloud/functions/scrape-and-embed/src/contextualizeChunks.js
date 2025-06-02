import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const getContextPrompt = ({ text, chunk }) => `
Review the full document and the provided chunk. Your task is to rephrase the chunk while preserving all key information. Maintain the overall length and content integrity of the original chunk.

FULL DOCUMENT:
<document>
${text}
</document>

CHUNK TO REPHRASE:
<chunk>
${chunk}
</chunk>

Guidelines:
- Retain all essential facts and details from the original chunk.
- Keep the size of the chunk approximately the same.
- Do not add or remove significant content, nor insert extraneous context.

Return only the rephrased chunk.
`;

const contextualizeChunk = async ({ google, text, chunk }) => {
    try {
        const result = await generateText({
            model: google("gemini-2.0-flash-001"),
            temperature: 0,
            maxTokens: 250,
            prompt: getContextPrompt({ text, chunk }),
        });
        return result.text;
    } catch (error) {
        console.error("Error contextualizing chunk:", error);
        return chunk; // Fallback to original content
    }
};

export const contextualizeChunks = async ({ docs, text }) => {
    try {
        // Create two Google AI instances with different API keys
        const googleInstance1 = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_AI_API_KEY,
        });
        const googleInstance2 = createGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_AI_API_KEY_TELEPERSON,
        });

        // Process docs in batches of 10
        const batchSize = 10;
        const results = [];

        // Use explicit batch number to alternate instances
        for (let i = 0; i < docs.length; i += batchSize) {
            const batchNumber = i / batchSize; // i is always a multiple of batchSize
            const currentGoogle = batchNumber % 2 === 0 ? googleInstance1 : googleInstance2;

            const batch = docs.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (doc) => {
                    const contextualizedContent = await contextualizeChunk({
                        google: currentGoogle,
                        text,
                        chunk: doc.content,
                    });

                    return {
                        ...doc,
                        content: contextualizedContent,
                    };
                })
            );

            results.push(...batchResults);
        }

        return results;
    } catch (error) {
        console.error("Error in contextualizeChunks:", error);
        return docs; // Return original docs if the process fails
    }
};
