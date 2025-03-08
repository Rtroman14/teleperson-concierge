"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import Vapi from "@vapi-ai/web";
import { nanoid } from "@/lib/utils";

const ChatContext = createContext({});

const mapMessages = (messages) =>
    messages
        .filter(({ content }) => content !== "")
        .map(({ role, content }) => ({ role, content }));

// * use local storage for wa-user
// * user session storage for conversationID && wa-thread

const instructions = ({ firstName, vendors }) => {
    let personalizedGreeting = "Please provide personalized, unbiased guidance to assist the user.";
    if (firstName) {
        personalizedGreeting = `You are currently assisting ${firstName}. Ensure that your guidance is tailored and directly addresses the user's inquiry.`;
    }

    return `
## Context:
You are Teleperson's AI-powered Concierge, a neutral and independent assistant dedicated to providing clear, factual, and unbiased guidance to users regarding vendors in their Vendor Hub. ${personalizedGreeting} Your role is to support users on any questions related to Teleperson or the vendors in their vendor hub.

## Vendors (${vendors.length}) in ${firstName}'s Vendor Hub:
${vendors.map((vendor) => `- ${vendor}`).join("\n")}

## Core Function:
- Offer practical assistance and general support for vendor-related inquiries.
- Equip users with actionable information to effectively manage their vendor relationships.

## Identity and Boundaries:
You are the Teleperson Concierge—a professional, neutral, and independent customer service assistant.
- Respond with clear, factual, and instructional language.
- Avoid vendor-specific biased wording (e.g., "we believe").
- Provide detailed guidance such as "TruStage does X. To accomplish this, please follow these steps…".

## Guidelines:
1. **Confidentiality**: Do not reference or disclose your internal knowledge base.
2. **Neutral Tone and Clarity**: Maintain a balanced and informative tone.
3. **Focus**: Keep responses relevant to Teleperson and the vendors in the user's Vendor Hub.
4. **Direct Support**: Provide all necessary details directly in your response.
5. **Brevity**: Limit responses to 1-4 sentences, focusing on the most pertinent information.
6. **Avoid Repetition**: Do not repeat the same phrases or examples across responses.
7. **Tool Invocation Requirement**: Always invoke the \`get_more_information\` tool when the user's inquiry involves vendor-specific queries. If additional detail is required, use this tool to obtain accurate information before providing your final answer.
8. **Fallback Response**: If specific details are not available, reply with:  
   "I apologize, but I don't have specific information about [user's query]. However, I'd be happy to assist you with any questions related to Teleperson or vendor support within your Vendor Hub."
9. **User Address**: Avoid mentioning the user's name in every message.

## Available Tools:
### get_more_information
- **Description**: Retrieves detailed information about a vendor.
- **When to Use**: Invoke this tool when the user's query involves detailed inquiries about vendor-specific features, policies, or other relevant details.
- **Parameters**:
  - \`vendor_name\` (string): The name of the vendor that the user is asking about.
  - \`user_question\` (string): The detailed inquiry from the user. It should include enough context to be a standalone question or inquiry

### get_users_transactions
- **Description**: Retrieves the user's bank transactions.
- **When to Use**: Use this tool when the user inquires about their recent transactions or payment history.

### get_users_vendors
- **Description**: Fetches an up-to-date list of vendors in the user's Vendor Hub.
- **When to Use**: Use this tool to provide an overview of available vendors and their descriptions.
`;
};

// Add this function before the ChatProvider component
const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 11) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};

const getInitialMessage = (chatbotSettings, telepersonUser) => {
    const timeGreeting = getTimeBasedGreeting();
    const userName = telepersonUser?.firstName || "";

    // If we have a user name, include it in the greeting
    const greeting = userName
        ? `${timeGreeting} ${userName}, how can I assist you with your vendor hub today?`
        : `${timeGreeting}, how can I assist you with your vendor hub today?`;

    return {
        id: nanoid(),
        role: "assistant",
        content: chatbotSettings?.data?.welcome_message || greeting,
    };
};

const initialTelepersonUser = {
    id: "",
    email: "",
    name: "",
    firstName: "",
    lastNAme: "",
    vendors: [],
};

export function ChatProvider({ children, ...props }) {
    const [open, setOpen] = useState(true);
    const [chatbotSettings, setChatbotSettings] = useState(props.initialSettings);
    const [conversationID, setConversationID] = useState(null);
    const [telepersonUser, setTelepersonUser] = useState(initialTelepersonUser);

    // Create dynamic initial messages
    const [initialMessages, setInitialMessages] = useState(
        () => props.initialMessages || [getInitialMessage(props.initialSettings, telepersonUser)]
    );

    const {
        messages,
        setMessages,
        data,
        setData,
        input,
        setInput,
        append,
        handleInputChange,
        handleSubmit,
        isLoading,
    } = useChat({
        api: "/api/chat",
        initialMessages: initialMessages,
        body: {
            chatbotSettings: props.initialSettings,
            conversationID,
            telepersonUser,
        },
        experimental_throttle: 50,
        onFinish: (event) => {
            const annotation = event?.annotations?.find((a) => a.chatbotID === chatbotSettings.id);
            const newConversationID = annotation?.conversationID;

            if (newConversationID && newConversationID !== conversationID) {
                setConversationID(newConversationID);

                if (props.environment !== "sandbox") {
                    sessionStorage.setItem("wa-conversationID", newConversationID);
                }
            }
        },
    });

    // TODO: add test telepersonUser

    // * Load teleperson user from localStorage on initial render
    useEffect(() => {
        const storedTelepersonUser = localStorage.getItem("teleperson-user");

        if (storedTelepersonUser) {
            try {
                const parsedUser = JSON.parse(storedTelepersonUser);
                setTelepersonUser(parsedUser);
            } catch (error) {
                console.error("Error parsing teleperson user from localStorage:", error);
                localStorage.removeItem("teleperson-user");
            }
        } else {
            // ! DELETE THIS IN PRODUCTION
            // If no user in localStorage, fetch with default email for development
            fetchTelepersonUserData("jesse@teleperson.com");
        }
    }, []);

    // * Fetch user data and vendors from Teleperson API
    const fetchTelepersonUserData = async (email) => {
        try {
            const response = await fetch("/api/teleperson/user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch user data");
            }

            const userData = await response.json();

            // Format user data
            const formattedUser = {
                id: userData.user.id,
                email: userData.user.email,
                name: `${userData.user.firstName} ${userData.user.lastName}`,
                firstName: userData.user.firstName,
                lastNAme: userData.user.lastName,
                vendors: userData.vendors.map((vendor) => vendor.companyName),
            };

            // Save to localStorage and update state
            localStorage.setItem("teleperson-user", JSON.stringify(formattedUser));
            setTelepersonUser(formattedUser);

            return formattedUser;
        } catch (error) {
            console.error("Error fetching Teleperson user data:", error);
            return null;
        }
    };

    // * receive teleperson user ID
    useEffect(() => {
        const handleMessage = async (event) => {
            // Accept messages from allowed domains
            const allowedOrigins = ["teleperson.com", "http://127.0.0.1:5500"];
            if (!allowedOrigins.includes(event.origin)) return;

            if (event.data?.type === "SET_USER_EMAIL") {
                const email = event.data.email;

                // TODO: add email validation check?

                // Check if we need to fetch new user data
                if (!telepersonUser || telepersonUser.email !== email) {
                    // Fetch complete user data including vendors
                    await fetchTelepersonUserData(email);
                } else {
                    // Email matches current user, no need to fetch
                    console.log("User email matches current telepersonUser");
                }
            }
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [telepersonUser]);

    // Update initial message when telepersonUser changes
    useEffect(() => {
        if (telepersonUser) {
            setInitialMessages([getInitialMessage(chatbotSettings, telepersonUser)]);

            // If we're at the beginning of the conversation, update the current messages too
            if (messages.length <= 1) {
                setMessages([getInitialMessage(chatbotSettings, telepersonUser)]);
            }
        }
    }, [telepersonUser]);

    const handleRefresh = () => {
        if (props.environment !== "sandbox") {
            sessionStorage.setItem("wa-thread", JSON.stringify(initialMessages));
        }
        sessionStorage.removeItem("wa-conversationID");

        setMessages(initialMessages);
        setData(undefined);
        setConversationID(null);
    };

    useEffect(() => {
        if (props.environment === "sandbox") return;

        if (!isLoading && messages.length > props.initialMessages.length) {
            sessionStorage.setItem("wa-thread", JSON.stringify(messages));
        }
    }, [isLoading]);

    useEffect(() => {
        if (props.environment === "sandbox") {
            localStorage.removeItem("wa-user");

            return;
        }

        let storedChatUser = localStorage.getItem("wa-user");
        let storedConversationID = sessionStorage.getItem("wa-conversationID");

        const updatedData = {};
        if (storedChatUser) {
            storedChatUser = JSON.parse(storedChatUser);
            if (storedChatUser.id !== "" && storedChatUser.chatbots_id === chatbotSettings.id) {
                updatedData.chatUser = storedChatUser;
            } else {
                localStorage.removeItem("wa-user");
            }
        }

        if (storedConversationID) {
            updatedData.conversationID = storedConversationID;
        }

        if (Object.keys(updatedData).length > 0) {
            setData(updatedData);
        }

        let thread = sessionStorage.getItem("wa-thread");
        if (thread) {
            thread = JSON.parse(thread);
        }

        if (thread?.length > props.initialMessages.length) {
            setMessages(mapMessages(thread));
        }
    }, []);

    useEffect(() => {
        console.log(`\n\ndata (conversationID) -->`, data);

        if (conversationID !== data?.conversationID && data?.conversationID) {
            setConversationID(data.conversationID);

            if (props.environment !== "sandbox") {
                sessionStorage.setItem("wa-conversationID", data.conversationID);
            }
        }
    }, [data?.conversationID]);

    // * -------------------------------- VAPI --------------------------------
    const [isCallActive, setIsCallActive] = useState(false);
    const vapiRef = useRef(null);

    const [connecting, setConnecting] = useState(false);
    const [connected, setConnected] = useState(false);

    const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);

    const callSessionRef = useRef(null);

    const handleCall = () => {
        setIsCallActive(true);
        startCallInline();
    };

    // Initialize Vapi instance once
    useEffect(() => {
        vapiRef.current = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);

        // Store reference to current vapi instance for cleanup
        const vapi = vapiRef.current;

        // Set up event listeners
        vapi.on("call-start", () => {
            console.log("vapi.on call-start");
            setConnecting(false);
            setConnected(true);
            const newSessionId = nanoid();
            callSessionRef.current = newSessionId;
        });

        vapi.on("call-end", () => {
            console.log("vapi.on call-end");
            setConnecting(false);
            setConnected(false);
            setIsCallActive(false);
            callSessionRef.current = null;
        });

        vapi.on("speech-start", () => {
            // console.log("vapi.on speech-start");
            setAssistantIsSpeaking(true);
        });

        vapi.on("speech-end", () => {
            // console.log("vapi.on speech-end");
            setAssistantIsSpeaking(false);
        });

        vapi.on("volume-level", (level) => {
            // console.log("vapi.on volume-level");
            setVolumeLevel(level);
        });

        vapi.on("error", (error) => {
            console?.error("vapi.on error:", error);
            setConnecting(false);
        });

        // Various assistant messages can come back (like function calls, transcripts, etc)
        vapi.on("message", (message) => {
            // console.log("vapi.on message:", message);

            if (message.type === "conversation-update") {
                const currentCallSession = callSessionRef.current;

                const formattedMessages = message.conversation
                    .filter(({ role }) => role === "assistant" || role === "user")
                    .map(({ role, content }) => ({
                        id: nanoid(),
                        role,
                        content,
                        callSession: currentCallSession,
                    }));

                if (formattedMessages.length) {
                    const lastMessage = formattedMessages[formattedMessages.length - 1];
                    // Update messages with callSession awareness
                    setMessages((prevMessages) => {
                        if (
                            prevMessages.length > 0 &&
                            prevMessages[prevMessages.length - 1].role === lastMessage.role &&
                            prevMessages[prevMessages.length - 1].callSession ===
                                currentCallSession &&
                            currentCallSession !== null
                        ) {
                            // Replace the last message with the new message (same role, same call session)
                            return [...prevMessages.slice(0, prevMessages.length - 1), lastMessage];
                        } else {
                            // Append the new message (different role or different call session)
                            return [...prevMessages, lastMessage];
                        }
                    });
                }
            }

            // if (message.type === "transcript" && message.transcriptType === "final") {
            //     setMessages(function (prevMessages) {
            //         // If there is at least one message and the roles match,
            //         // append the transcript to the last message's content (after a space)
            //         if (
            //             prevMessages.length > 0 &&
            //             prevMessages[prevMessages.length - 1].role === message.role
            //         ) {
            //             var lastMessage = prevMessages[prevMessages.length - 1];
            //             var updatedLastMessage = {
            //                 ...lastMessage,
            //                 content: lastMessage.content + " " + message.transcript,
            //             };
            //             return [
            //                 ...prevMessages.slice(0, prevMessages.length - 1),
            //                 updatedLastMessage,
            //             ];
            //         } else {
            //             // Otherwise, create a new message from the transcript
            //             return [
            //                 ...prevMessages,
            //                 {
            //                     id: nanoid(),
            //                     role: message.role,
            //                     content: message.transcript,
            //                 },
            //             ];
            //         }
            //     });
            // }
        });

        // Cleanup function to remove event listeners
        return () => {
            vapi.removeAllListeners();
        };
    }, []); // Empty dependency array means this runs once on mount

    // Move assistantOptions to be created dynamically when needed
    // https://docs.vapi.ai/api-reference/assistants/create
    const createAssistantOptions = (telepersonUser) => {
        const timeGreeting = getTimeBasedGreeting();
        const firstName = telepersonUser?.firstName || "";

        let vendors = telepersonUser?.vendors || [];
        const testVendors = ["TruStage", "Teleperson", "UW Credit Union", "Badger Meter"];
        vendors = [...vendors, ...testVendors];

        // Dynamic first message based on user name
        const firstMessage = firstName
            ? `${timeGreeting} ${firstName}, this is Jessica, your Teleperson Concierge. How can I help you today?`
            : "Hey, this is Jessica, your Teleperson Concierge. Who do I have the pleasure of speaking with today?";

        console.log(`telepersonUser.id -->`, telepersonUser.id);

        return {
            // name: "Teleperson Concierge",
            firstMessage,
            // transcriber: {
            //     provider: "deepgram",
            //     model: "nova-2",
            //     language: "en-US",
            // },
            // voice: {
            //     provider: "cartesia",
            //     voiceId: "794f9389-aac1-45b6-b726-9d9369183238",
            // },
            voice: {
                provider: "11labs",
                voiceId: "g6xIsTj2HwM6VR4iXFCw",
            },
            serverMessages: [
                "tool-calls",
                "end-of-call-report",
                `transcript[transcriptType="final"]`,
            ],
            model: {
                provider: "openai",
                model: "gpt-4o-mini",
                // provider: "google",
                // model: "gemini-2.0-flash",
                // model: "gemini-2.0-pro-exp-02-05",
                messages: [
                    {
                        role: "system",
                        content: instructions({ firstName, vendors }),
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
                        messages: [
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
                            // {
                            //     type: "request-complete",
                            //     content: "The weather in location is",
                            // },
                            {
                                type: "request-failed",
                                content: "I couldn't get the information right now.",
                            },
                            // {
                            //     type: "request-response-delayed",
                            //     content:
                            //         "It appears there is some delay in communication with the weather API.",
                            //     timingMilliseconds: 2000,
                            // },
                        ],
                        server: {
                            url: "https://webagent.ai/api/chat/teleperson/voice/vapi",
                            // url: "https://df28-2601-280-5c00-7d80-5804-412f-123c-8fcd.ngrok-free.app/api/chat/teleperson/voice/vapi",
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
                                        description: `The id of the teleperson user which is ${telepersonUser.id}`,
                                    },
                                },
                                required: ["teleperson_user_id"],
                            },
                            // strict: true,
                        },
                        messages: [
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
                        ],
                        server: {
                            url: "https://webagent.ai/api/chat/teleperson/voice/transactions",
                            // url: "https://e4f0-2601-280-5c00-7d80-19c7-4be4-67ae-76d6.ngrok-free.app/api/chat/teleperson/voice/transactions",
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
                                        description: `The id of the teleperson user which is ${telepersonUser.id}`,
                                    },
                                },
                                required: ["teleperson_user_id"],
                            },
                        },
                        messages: [
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
                        ],
                        server: {
                            url: "https://webagent.ai/api/chat/teleperson/voice/vendors",
                            // url: "https://6cb6-199-117-62-42.ngrok-free.app/api/chat/teleperson/voice/vendors",
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
            // credentials: [
            //     {
            //         provider: "11labs",
            //         apiKey: "api",
            //     },
            // ],
        };
    };

    // Update the startCallInline function to create dynamic assistantOptions
    const startCallInline = () => {
        setConnecting(true);

        // Create dynamic assistantOptions with current telepersonUser
        const dynamicAssistantOptions = createAssistantOptions(telepersonUser);

        // Start the call with dynamic options
        vapiRef.current.start("e2af608c-082a-4dfc-a444-535e5642a7f5", dynamicAssistantOptions);
    };

    const endCall = () => {
        console.log("endCall");
        vapiRef.current.stop();
        setConnected(false);
        setIsCallActive(false);
    };

    return (
        <ChatContext.Provider
            value={{
                open,
                setOpen,
                chatbotSettings,
                setChatbotSettings,
                conversationID,
                setConversationID,
                messages,
                setMessages,
                data,
                setData,
                input,
                setInput,
                append,
                handleInputChange,
                handleSubmit,
                isLoading,
                handleRefresh,

                handleCall,
                endCall,
                isCallActive,
                connecting,
                connected,
                volumeLevel,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export const useChatContext = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChatContext must be used within a ChatProvider");
    }
    return context;
};
