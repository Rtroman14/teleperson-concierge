"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import Vapi from "@vapi-ai/web";
import { nanoid } from "@/lib/utils";
import { getVapiAssistantConfig } from "@/lib/agent-settings";

const ChatContext = createContext({});

const mapMessages = (messages) =>
    messages
        .filter(({ content }) => content !== "")
        .map(({ role, content }) => ({ role, content }));

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
    lastName: "",
    vendors: [],
};

export function ChatProvider({ children, ...props }) {
    const [open, setOpen] = useState(true);
    const [chatbotSettings, setChatbotSettings] = useState(props.initialSettings);
    const [conversationID, setConversationID] = useState(null);
    const [telepersonUser, setTelepersonUser] = useState(initialTelepersonUser);
    const [previousConversations, setPreviousConversations] = useState(null);

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
        api: "/api/chat/sales",
        initialMessages: props.initialMessages,
        body: {
            chatbotSettings: props.initialSettings,
            conversationID,
            previousConversations,
        },
        experimental_throttle: 50,
        onFinish: (event) => {
            const annotation = event?.annotations?.find((a) => a.chatbotID === chatbotSettings.id);
            const newConversationID = annotation?.conversationID;

            if (newConversationID && newConversationID !== conversationID) {
                setConversationID(newConversationID);

                sessionStorage.setItem("tc-sales-conversationID", newConversationID);
            }
        },
    });

    const handleRefresh = () => {
        sessionStorage.setItem("tc-sales-thread", JSON.stringify(props.initialMessages));
        sessionStorage.removeItem("tc-sales-conversationID");

        setMessages(props.initialMessages);
        setData(undefined);
        setConversationID(null);
    };

    useEffect(() => {
        if (!isLoading && messages.length > props.initialMessages.length) {
            sessionStorage.setItem("tc-sales-thread", JSON.stringify(messages));
        }
    }, [isLoading]);

    useEffect(() => {
        let storedChatUser = localStorage.getItem("tc-sales-user");
        let storedConversationID = sessionStorage.getItem("tc-sales-conversationID");

        const updatedData = {};
        if (storedChatUser) {
            try {
                storedChatUser = JSON.parse(storedChatUser);
                // Only update data if we have valid user data
                if (storedChatUser && typeof storedChatUser === "object") {
                    updatedData.chatUser = storedChatUser;
                }
            } catch (error) {
                console.error("Error parsing stored user data:", error);
                // Only remove if there's an actual parsing error
                localStorage.removeItem("tc-sales-user");
            }
        }

        if (storedConversationID) {
            updatedData.conversationID = storedConversationID;
        }

        if (Object.keys(updatedData).length > 0) {
            setData(updatedData);
        }

        let thread = sessionStorage.getItem("tc-sales-thread");
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

            sessionStorage.setItem("tc-sales-conversationID", data.conversationID);
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
        const testVendors = [
            "TruStage",
            "Teleperson",
            "UW Credit Union",
            "Badger Meter",
            "Lands' End",
            "Clarios, LLC",
            "Generac Power Systems",
            "Rockline Industries",
            "Exact Sciences Coporation",
        ];
        vendors = [...vendors, ...testVendors];

        // Dynamic first message based on user name
        const firstMessage = firstName
            ? `${timeGreeting} ${firstName}, this is Jessica, your Teleperson Concierge. How can I help you today?`
            : "Hey, this is Jessica, your Teleperson Concierge. Who do I have the pleasure of speaking with today?";

        return getVapiAssistantConfig({
            firstName,
            vendors,
            firstMessage,
            telepersonUserId: telepersonUser.id,
            previousConversations,
        });
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
                environment: props.environment,
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
