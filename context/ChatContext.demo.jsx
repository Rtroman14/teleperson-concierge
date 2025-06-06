"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useChat } from "ai/react";
import Vapi from "@vapi-ai/web";
import { nanoid } from "@/lib/utils";
import { getVapiSalesAssistantConfig } from "@/lib/agent-settings";
import _ from "@/lib/Helpers";
import { format } from "date-fns";

const ChatContext = createContext({});

const mapMessages = (messages) =>
    messages
        .filter(({ content }) => content !== "")
        .map(({ role, content }) => ({ role, content }));

// Add this function before the ChatProvider component
const getClientInfo = () => {
    return {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language || navigator.languages[0],
        languages: navigator.languages,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        timezoneOffset: new Date().getTimezoneOffset(),
    };
};

export function ChatProvider({ children, ...props }) {
    const [open, setOpen] = useState(true);
    const [chatbotSettings, setChatbotSettings] = useState(props.initialSettings);
    const [conversationID, setConversationID] = useState(null);

    const STORAGE_KEY = `demo-${props.industry}`;

    const prompt = _.getPromptName(props.industry);

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
        api: `/api/chat/industry/${props.industry}`,
        initialMessages: props.initialMessages,
        body: {
            chatbotSettings: props.initialSettings,
            conversationID,
        },
        experimental_throttle: 50,
        onFinish: (event) => {
            const annotation = event?.annotations?.find((a) => a.chatbotID === chatbotSettings.id);
            const newConversationID = annotation?.conversationID;

            if (newConversationID && newConversationID !== conversationID) {
                setConversationID(newConversationID);

                sessionStorage.setItem(`${STORAGE_KEY}-conversationID`, newConversationID);
            }
        },
    });

    const handleRefresh = () => {
        sessionStorage.setItem(`${STORAGE_KEY}-thread`, JSON.stringify(props.initialMessages));
        sessionStorage.removeItem(`${STORAGE_KEY}-conversationID`);

        setMessages(props.initialMessages);
        setData(undefined);
        setConversationID(null);
    };

    useEffect(() => {
        const clientLocation = getClientInfo();

        if (clientLocation?.timezone) {
            console.log(`clientLocation.timezone -->`, clientLocation.timezone);
        }
    }, []);

    useEffect(() => {
        if (!isLoading && messages.length > props.initialMessages.length) {
            sessionStorage.setItem(`${STORAGE_KEY}-thread`, JSON.stringify(messages));
        }
    }, [isLoading]);

    useEffect(() => {
        let storedChatUser = localStorage.getItem(`${STORAGE_KEY}-user`);
        let storedConversationID = sessionStorage.getItem(`${STORAGE_KEY}-conversationID`);

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
                localStorage.removeItem(`${STORAGE_KEY}-user`);
            }
        }

        if (storedConversationID) {
            updatedData.conversationID = storedConversationID;
        }

        if (Object.keys(updatedData).length > 0) {
            setData(updatedData);
        }

        let thread = sessionStorage.getItem(`${STORAGE_KEY}-thread`);
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

            sessionStorage.setItem(`${STORAGE_KEY}-conversationID`, data.conversationID);
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

    // Update the startCallInline function to create dynamic assistantOptions
    const startCallInline = async () => {
        setConnecting(true);

        try {
            const clientLocation = getClientInfo();

            // First, try to get timezone from client info
            let userTimeZone = clientLocation?.timezone || "";

            // If no timezone from client info, fetch from geo API as fallback
            if (!userTimeZone) {
                try {
                    const locationResponse = await fetch("/api/geo");
                    if (locationResponse.ok) {
                        userTimeZone = await locationResponse.json();
                    }
                } catch (locationError) {
                    console.warn("Failed to fetch user location:", locationError);
                    // Continue without location data
                }
            }

            console.log(`userTimeZone -->`, userTimeZone);

            // Fetch the system message from Langfuse
            const response = await fetch("/api/langfuse/prompt", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    promptName: prompt.voicePrompt,
                    data: {
                        today: format(new Date(), "EEEE, MMMM do, yyyy"),
                        timeZone: userTimeZone,
                    },
                }),
            });
            if (!response.ok) throw new Error("Failed to fetch system message");
            const promptResult = await response.json();

            let systemMessage = "";

            if (!promptResult.success) {
                // TODO: handle this
            }

            systemMessage = promptResult.data.systemMessage;

            // Create dynamic assistantOptions with current telepersonUser and fetched system message
            const dynamicAssistantOptions = getVapiSalesAssistantConfig(systemMessage);

            // Start the call with dynamic options
            vapiRef.current.start("e2af608c-082a-4dfc-a444-535e5642a7f5", dynamicAssistantOptions);
        } catch (error) {
            console.error("Error fetching system message:", error);
            setConnecting(false);

            // Fallback to default configuration if fetch fails
            const dynamicAssistantOptions = getVapiSalesAssistantConfig();
            vapiRef.current.start("e2af608c-082a-4dfc-a444-535e5642a7f5", dynamicAssistantOptions);
        }
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
