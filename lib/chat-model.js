import { generateText } from "ai";
import slackNotification from "@/lib/slackNotification";

class ChatModel {
    constructor({ apiKey, temperature, model, supabase }) {
        this.apiKey = apiKey;
        this.temperature = temperature;
        this.model = model;
        this.supabase = supabase;
    }

    rephraseInquiryAgent = async ({ conversationString, inquiry, model = null, system = null }) => {
        try {
            const defaultSystem = `
## Content:
- You are a language model tasked with analyzing and potentially rephrasing the user's last message. Your goal is to ensure that each query has sufficient context to be understood on its own, without requiring additional information from previous conversations.

## Instructions:
1. Carefully read the user's original query.
2. Assess whether the query contains enough context to be understood as a stand-alone question.
3. If the original query is self-contained:
    - Respond with the user's original query exactly as provided.
4. If the original query lacks sufficient context:
    - Rephrase the query to include necessary context from the current conversation only.
    - Do not add any information that isn't explicitly mentioned in the conversation.
    - Ensure the rephrased query can be understood without reference to previous exchanges.
    - Include the topic discussed.

## Guidelines:
- Respond with the query only, either original or rephrased.
- Do not include any explanations or additional commentary in your response.`;

            const prompt = `
Below is the conversation between you and the user. Please read through it and then assess the user's last message.

Conversation History: """${conversationString}"""

User's Original Query: """${inquiry}"""`;

            const response = await this.generateResponse({
                system: system || defaultSystem,
                prompt,
                model,
            });

            return {
                success: true,
                data: response.data.response,
            };
        } catch (error) {
            console.error("rephraseInquiryAgent() -->", JSON.stringify(error));
            return {
                success: false,
                data: inquiry,
                message: this.defaultErrorMessage,
            };
        }
    };

    generateResponse = async ({ system, prompt, messages, model = null }) => {
        try {
            // Validate that either prompt or messages is provided, but not both
            if ((!prompt && !messages) || (prompt && messages)) {
                throw new Error("Either prompt or messages must be provided, but not both");
            }

            const usedModel = model !== null ? model : this.model;
            const { text } = await generateText({
                system,
                model: usedModel,
                ...(prompt ? { prompt } : { messages }),
            });

            return {
                success: true,
                data: {
                    response: text,
                },
            };
        } catch (error) {
            console.error(error);
            return {
                success: false,
                message: error.message,
            };
        }
    };
}

export default ChatModel;
