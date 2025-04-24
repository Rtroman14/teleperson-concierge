export const modelSelection = [
    {
        model: "gpt-4o-mini",
        name: "gpt-4o-mini",
        messageCredits: 1,
        provider: "openai",
        premium: false,
    },
    {
        model: "gpt-4o",
        name: "gpt-4o",
        messageCredits: 1,
        provider: "openai",
        premium: false,
    },
    // {
    //     model: "o3-mini",
    //     name: "o3-mini",
    //     messageCredits: 1,
    //     provider: "openai",
    //     premium: true,
    // },
    {
        model: "claude-3-5-sonnet-latest",
        name: "claude-3-5-sonnet",
        messageCredits: 1,
        provider: "anthropic",
        premium: true,
    },
    {
        model: "gemini-2.0-flash-001",
        name: "gemini-2.0-flash",
        messageCredits: 1,
        provider: "google",
        premium: true,
    },
];

export const textMaxCharacters = 4000;
export const faqMaxCharacters = 1000;
export const promptMaxCharacters = 20000;
