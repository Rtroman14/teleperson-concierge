export const getVapiAssistantConfig = ({
    vendors,
    firstMessage,
    telepersonUserId,
    systemMessage,
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
                content: systemMessage,
            },
        ],
        tools: [
            {
                type: "function",
                async: false,
                function: {
                    name: "get_vendor_information",
                    description:
                        "Retrieve detailed information from your knowledge base for vendor-specific queries",
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
    maxDurationSeconds: 300,
    backgroundSound: "off",
    server: {
        url: "https://webhook.site/39d44ed3-8a39-4de2-be7d-57a71e0f07cc",
    },
});

export const getVapiSalesAssistantConfig = (systemMessage) => ({
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
                content: systemMessage,
            },
        ],
        // tools: [
        //     {
        //         type: "function",
        //         async: false,
        //         function: {
        //             name: "get_more_information",
        //             description: "Get more information about Teleperson",
        //             parameters: {
        //                 type: "object",
        //                 properties: {
        //                     vendor_name: {
        //                         type: "string",
        //                         description: "Teleperson - use this for the vendor name",
        //                         value: "Teleperson",
        //                     },
        //                     user_question: {
        //                         type: "string",
        //                         description:
        //                             "The detailed inquiry from the user. It should include enough context to be a standalone question or inquiry",
        //                     },
        //                 },
        //                 required: ["vendor_name", "user_question"],
        //             },
        //         },
        //         messages: getToolMessages(),
        //         server: {
        //             url: "https://teleperson.webagent.ai/api/chat/voice/vapi",
        //             timeoutSeconds: 30,
        //         },
        //     },
        // ],
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
    maxDurationSeconds: 300,
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
