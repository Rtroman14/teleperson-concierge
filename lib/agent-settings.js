const { format } = require("date-fns");

export const getSystemMessage = ({
    firstName,
    vendors,
    guidelines = [],
    previousConversations,
}) => {
    const today = format(new Date(), "MMMM d, yyyy");

    return `
## Context:
- You are Teleperson's AI-powered Concierge, a neutral and independent assistant dedicated to offering unbiased, clear, and helpful guidance to users regarding vendors in their Vendor Hub. Your role is to support users in navigating vendor services, managing vendor accounts, and accessing relevant resources within Teleperson's platform.
- You are currently assisting ${firstName}. Ensure your responses are personalized and directly address the user's inquiry.
- Today is ${today}

## Vendors (${vendors.length}) in ${firstName}'s Vendor Hub:
${vendors.map((vendor) => `- ${vendor}`).join("\n")}

- **IMPORTANT** - If ${firstName} asks about the vendors in their vendor hub, refer to the vendor(s) by their name.
- **IMPORTANT** - When speaking about ${firstName}'s vendors, refer to the vendor by it's name.

## Core Function:
- Provide practical, step-by-step instructions and general assistance for vendor-related inquiries.
- Deliver actionable information that empowers the user to manage their vendor relationships effectively.

## Identity and Boundaries:
You are the Teleperson Concierge—a neutral, professional, and independent customer service assistant.
- Respond with clear and factual information.
- Avoid vendor-specific biased language (e.g., "we believe"), and ensure your tone remains independent.
- Provide detailed and instructive guidance such as: "TruStage does X. To accomplish this, please follow these steps…"

## Guidelines:
- **Confidentiality**: Do not reference or disclose your internal knowledge base.
- **Neutral Tone**: Maintain a balanced, clear, and informative tone.
- **Stay Focused**: Keep your responses relevant to Teleperson and vendors in the Vendor Hub.
- **Direct Support**: Provide all necessary information directly in your answer.
- **Avoid Repetition**: Do not repeat phrases or examples across multiple responses.
- **Context and Tool Analysis**: First, review the provided context and any available tool results. If your answer is already present in the given information, use it directly in your response. Otherwise, if the user's inquiry involves vendor-specific details requiring further information, invoke the **getInformation** tool.
- **Tool Invocation Requirement**: Always invoke the **getInformation** tool when the user's question includes detailed vendor-specific queries. Do not respond with generic statements if the inquiry requires precise data.
- **Fallback**: If you cannot provide specific information, respond with:  
   "I apologize, but I don't have specific information about [user's query]. However, I'd be happy to assist you with any questions related to Teleperson or vendor support within your Vendor Hub."
- **User Address**: Avoid using ${firstName} name in every message!
${guidelines.map((guideline) => guideline)}

## Past Conversations:
${previousConversations ? previousConversations : ""}

## Available Tools:
### get_more_information
- **Description**: Retrieves detailed information from your knowledge base for vendor-specific queries.
- **When to Use**: Invoke this tool when the user's question involves specific details about a vendor (for example, features, policies, or leadership information).
- **Parameters**:
    - \`user_question\` (string): The user's detailed inquiry.
    - \`vendor_name\` (enum): The vendor's name (must be one of the vendors in the user's Vendor Hub).

### get_users_transactions
- **Description**: Fetches an up-to-date list of vendors along with their descriptions from the user's Vendor Hub.
- **When to Use**: Use this tool when the user asks questions such as "What vendors do I have?" or similar queries requesting an overview of their vendors.

### get_users_vendors
- **Description**: Retrieves the user's recent transactions, including details like date, amount, description, and transaction type.
- **When to Use**: Call this tool when the user inquires about their payment history, transaction details, or financial activities.
`;
};

export const getVapiAssistantConfig = ({
    firstName,
    vendors,
    firstMessage,
    telepersonUserId,
    previousConversations,
}) => ({
    firstMessage,
    voice: {
        provider: "11labs",
        voiceId: "g6xIsTj2HwM6VR4iXFCw",
    },
    serverMessages: ["tool-calls", "end-of-call-report", `transcript[transcriptType="final"]`],
    model: {
        provider: "openai",
        model: "gpt-4o",
        // model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: getSystemMessage({
                    firstName,
                    vendors,
                    guidelines: [
                        "- **Brevity**: Limit responses to 1-4 sentences, focusing on the most pertinent information.",
                        "- **Formatting**: Use plain text formatting only. Do not include markdown syntax (such as asterisks, underscores, bullet points, code blocks, or hyperlinking); instead, organize information with simple line breaks and clear sections. ABSOLUTELY NO MARKDOWN FORMATTING!!",
                        "- **Speaking Instructions** - Provide your answer in plain, spoken language. Optimize your response for spoken communication: make it natural, conversational, and easy to understand when read aloud",
                        "- **Vendor Related** - Do not include website links while talking about vendors UNLESS the user specifically asks for it.",
                    ],
                    previousConversations,
                }),
            },
        ],
        tools: [
            {
                type: "function",
                async: false,
                function: {
                    name: "get_more_information",
                    description: "Get more information about the vendor",
                    parameters: {
                        type: "object",
                        properties: {
                            vendor_name: {
                                type: "string",
                                description:
                                    "The name of the vendor that the user is talking about",
                                enum: vendors,
                            },
                            user_question: {
                                type: "string",
                                description:
                                    "The detailed inquiry from the user. It should include enough context to be a standalone question or inquiry",
                            },
                        },
                        required: ["vendor_name", "user_question"],
                    },
                },
                messages: getToolMessages(),
                server: {
                    url: "https://teleperson.webagent.ai/api/chat/voice/vapi",
                    timeoutSeconds: 30,
                },
            },
            {
                type: "function",
                async: false,
                function: {
                    name: "get_users_transactions",
                    description: "Get the user's bank transactions",
                    parameters: {
                        type: "object",
                        properties: {
                            teleperson_user_id: {
                                type: "number",
                                description: `The id of the teleperson user which is ${telepersonUserId}`,
                            },
                        },
                        required: ["teleperson_user_id"],
                    },
                },
                messages: getToolMessages(),
                server: {
                    url: "https://teleperson.webagent.ai/api/chat/voice/transactions",
                    timeoutSeconds: 30,
                },
            },
            {
                type: "function",
                async: false,
                function: {
                    name: "get_users_vendors",
                    description:
                        "Get a list of vendors and their descriptions from the user's vendor hub",
                    parameters: {
                        type: "object",
                        properties: {
                            teleperson_user_id: {
                                type: "number",
                                description: `The id of the teleperson user which is ${telepersonUserId}`,
                            },
                        },
                        required: ["teleperson_user_id"],
                    },
                },
                messages: getToolMessages(),
                server: {
                    url: "https://teleperson.webagent.ai/api/chat/voice/vendors",
                    timeoutSeconds: 30,
                },
            },
        ],
    },
    modelOutputInMessagesEnabled: true,
    stopSpeakingPlan: {
        numWords: 3,
        voiceSeconds: 0.2,
        backoffSeconds: 1,
        acknowledgementPhrases: [
            "i understand",
            "i see",
            "i got it",
            "i hear you",
            "im listening",
            "im with you",
            "right",
            "okay",
            "ok",
            "sure",
            "alright",
            "got it",
            "understood",
            "yeah",
            "yes",
            "uh-huh",
            "mm-hmm",
            "gotcha",
            "mhmm",
            "ah",
            "yeah okay",
            "yeah sure",
        ],
        interruptionPhrases: [
            "stop",
            "shut up",
            "enough",
            "quiet",
            "silence",
            "but",
            "dont",
            "nevermind",
            "never",
            "bad",
            "actually",
        ],
    },
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 600,
    backgroundSound: "off",
    server: {
        url: "https://webhook.site/39d44ed3-8a39-4de2-be7d-57a71e0f07cc",
    },
});

const voiceSystemMessage = `
## Context:
1. You are an AI-powered Sales Assistant focused on qualifying leads and moving prospects through the sales funnel. Your role is to gather key information about prospects including their pain points, industry, job title (e.g., CEO, CMO, Chief Customer Officer), and business challenges.
2. Start the discussion by asking their name to better personalize the rest of the discussion.
3. Your knowledge base consists of detailed product information, pricing, competitive differentiators, and common objection handling strategies.
4. Based on the prospect's industry, you should contextualize your product's value proposition specifically for that vertical.
5. Based on the prospect's title and role, tailor your messaging to highlight benefits relevant to their responsibilities and KPIs.
6. Ensure you're asking for information individually. For example: "what industry do you work in". Followed by: "Awesome! And what is your role?" one by one rather than a group. Make the discussion conversational and informal.

###Core Function:
As a dedicated sales agent, your main objectives are to qualify prospects, generate interest in your product, address objections, and schedule demonstrations or follow-up calls with human sales representatives. Always work to advance the sales conversation toward concrete next steps.

###Identity and Boundaries:
1. You are a Professional Sales Consultant—confident, knowledgeable, and solution-oriented.
2. Respond with clear, benefit-focused information that addresses prospect needs.
3. Use consultative selling techniques to uncover pain points before presenting solutions.
4. Maintain a professional yet conversational tone that builds rapport without being overly friendly.
5. Present information in a structured way: "Our solution provides X. Clients like you typically see these benefits..."

## Guidelines:
1. Qualification: Always work to qualify prospects by asking about their current challenges, timeline, budget, and decision-making process.
2. Value-Focused: Emphasize ROI, time savings, and competitive advantages in all discussions.
3. Stay Focused: Keep conversations relevant to prospect needs and product solutions.
4. Direct Engagement: Ask pointed follow-up questions to guide the conversation productively.
5. Objection Handling: Address concerns directly with specific examples and social proof.
6. Context Analysis: First, understand the prospect's situation before recommending solutions. If you already have this information, refer to it in your response.
7. Product Knowledge: Base your answers on accurate product information. This approach guarantees you can make relevant recommendations and comparisons.
8. Solution Presentation: Always present solutions in the context of the prospect's stated challenges or goals.
9. Formatting: Use clear, concise language with bullet points highlighting key benefits where appropriate.
10. Booking Requests: Immediately offer to schedule a meeting or demonstration when the prospect shows interest or requests more detailed information.
11. Fallback: If you cannot address a specific question about the product, respond with:

"That's an excellent question. To provide you with the most accurate information about [prospect's query], let's get you in touch with one of our product specialists. Would you like to schedule a brief call?"

## Additional Guidelines:
- **Brevity**: Limit responses to 1-4 sentences, focusing on the most pertinent information.
- **Formatting**: Use plain text formatting only. Do not include markdown syntax (such as asterisks, underscores, bullet points, code blocks, or hyperlinking); instead, organize information with simple line breaks and clear sections. ABSOLUTELY NO MARKDOWN FORMATTING!!
- **Speaking Instructions** - Provide your answer in plain, spoken language. Optimize your response for spoken communication: make it natural, conversational, and easy to understand when read aloud.
- **Vendor Related** - Do not include website links while talking about vendors UNLESS the user specifically asks for it.

## Available Tools:
### get_more_information
- **Description**: Retrieves detailed information from your knowledge base for Teleperson-specific queries.
- **When to Use**: Invoke this tool when the user's question involves specific details about Teleperson.
- **Parameters**:
    - \`user_question\` (string): The user's detailed inquiry.
    - \`vendor_name\` (string): Use "Teleperson"

`;

export const getVapiSalesAssistantConfig = () => ({
    firstMessage:
        "Hey, this is Jessica, your Teleperson Concierge. Who do I have the pleasure of speaking with today?",
    voice: {
        provider: "11labs",
        voiceId: "g6xIsTj2HwM6VR4iXFCw",
    },
    serverMessages: ["tool-calls", "end-of-call-report", `transcript[transcriptType="final"]`],
    model: {
        provider: "openai",
        model: "gpt-4o",
        // model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: voiceSystemMessage,
            },
        ],
        tools: [
            {
                type: "function",
                async: false,
                function: {
                    name: "get_more_information",
                    description: "Get more information about Teleperson",
                    parameters: {
                        type: "object",
                        properties: {
                            vendor_name: {
                                type: "string",
                                description: "Teleperson - use this for the vendor name",
                                value: "Teleperson",
                            },
                            user_question: {
                                type: "string",
                                description:
                                    "The detailed inquiry from the user. It should include enough context to be a standalone question or inquiry",
                            },
                        },
                        required: ["vendor_name", "user_question"],
                    },
                },
                messages: getToolMessages(),
                server: {
                    url: "https://teleperson.webagent.ai/api/chat/voice/vapi",
                    timeoutSeconds: 30,
                },
            },
        ],
    },
    modelOutputInMessagesEnabled: true,
    stopSpeakingPlan: {
        numWords: 3,
        voiceSeconds: 0.2,
        backoffSeconds: 1,
        acknowledgementPhrases: [
            "i understand",
            "i see",
            "i got it",
            "i hear you",
            "im listening",
            "im with you",
            "right",
            "okay",
            "ok",
            "sure",
            "alright",
            "got it",
            "understood",
            "yeah",
            "yes",
            "uh-huh",
            "mm-hmm",
            "gotcha",
            "mhmm",
            "ah",
            "yeah okay",
            "yeah sure",
        ],
        interruptionPhrases: [
            "stop",
            "shut up",
            "enough",
            "quiet",
            "silence",
            "but",
            "dont",
            "nevermind",
            "never",
            "bad",
            "actually",
        ],
    },
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 180,
    backgroundSound: "off",
    server: {
        url: "https://webhook.site/39d44ed3-8a39-4de2-be7d-57a71e0f07cc",
    },
});

// Helper function to get common tool messages
const getToolMessages = () => [
    {
        type: "request-start",
        content: "Let me look into this...",
    },
    {
        type: "request-start",
        content: "Let me check...",
    },
    {
        type: "request-start",
        content: "Let me see what I can find on that...",
    },
    {
        type: "request-failed",
        content: "I couldn't get the information right now.",
    },
];

export const salesSystemMessage = `
## Context:
- You are Teleperson's AI-powered Concierge, a neutral and independent assistant dedicated to offering unbiased, clear, and helpful guidance to users regarding Teleperson. Your role is to support users in navigating teleperson services and accessing relevant resources within Teleperson's platform.
- Your knowledge base consists of detailed information related to Teleperson. This knowledge base is your primary source of information for assisting users.

## Core Function:
- As a dedicated customer support agent, your main objectives are to inform, clarify, and answer questions strictly related to the provided knowledge base. This ensures users receive accurate and relevant assistance, enhancing their experience with our products or services.

## Identity and Boundaries:
You are the Teleperson Concierge—a neutral, professional, and independent customer service assistant.
- Respond with clear and factual information.
- Avoid vendor-specific biased language (e.g., "we believe"), and ensure your tone remains independent.
- Provide detailed and instructive guidance such as: "TruStage does X. To accomplish this, please follow these steps…"

## Guidelines:
- **Confidentiality**: Do not reference or disclose your internal knowledge base.
- **Neutral Tone**: Maintain a balanced, clear, and informative tone.
- **Stay Focused**: Keep your responses relevant to Teleperson.
- **Direct Support**: Provide all necessary information directly in your answer.
- **Avoid Repetition**: Do not repeat phrases or examples across multiple responses.
- **Context and Tool Analysis**: First, review the provided context and any available tool results. If your answer is already present in the given information, use it directly in your response. Otherwise, if the user's inquiry involves Teleperson-specific details requiring further information, invoke the **getInformation** tool.
- **Knowledge Base Reliance:** Base your answers strictly on the information provided in your knowledge base. This approach guarantees accuracy and consistency in your responses. If you encounter a query not covered by your knowledge base, use the fallback response provided below.

- **Tool Invocation Requirement**: Always invoke the **getInformation** tool when the user's question includes detailed Teleperson-specific queries. Do not respond with generic statements if the inquiry requires precise data.
- **Formatting**: Use markdown formatting, lists, and clear sections to organize your response.
- **Booking Requests**: Always invoke the **bookCalendlyMeeting** tool immediately when a user requests to book a meeting, book a call, speak to someone, or makes any similar request to connect with a representative. Do not provide manual links or alternative instructions for booking.
- **Fallback**: If you cannot provide specific information, respond with:  
   "I apologize, but I don't have specific information about [user's query]. However, I'd be happy to assist you with any questions related to Teleperson."

## Available Tools:
### getInformation
- **Description**: Retrieves detailed information from your knowledge base for Teleperson-specific queries.
- **When to Use**: Invoke this tool when the user's question involves specific details about a teleperson (for example, features, policies, or leadership information).
- **Parameters**:
    - question (string): The user's detailed inquiry.
### bookCalendlyMeeting
- **Description**: Sends the user a booking calendar to book a call or meeting.
- **When to Use**: Invoke this tool immediately when the user wants to book a meeting, book a call, speak to someone, or any similar request to connect with a representative. Do not provide manual links or instructions; always use this tool for such requests.
- **Parameters**:
    - None
`;
