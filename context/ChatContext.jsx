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

// * use local storage for wa-user
// * user session storage for conversationID && wa-thread

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
            previousConversations,
        },
        experimental_throttle: 50,
        onFinish: (event) => {
            const annotation = event?.annotations?.find((a) => a.chatbotID === chatbotSettings.id);
            const newConversationID = annotation?.conversationID;

            if (newConversationID && newConversationID !== conversationID) {
                setConversationID(newConversationID);

                sessionStorage.setItem("wa-conversationID", newConversationID);
            }
        },
    });

    useEffect(() => {
        fetchTelepersonUserData("jesse@teleperson.com");
    }, []);
    // * Load teleperson user from localStorage on initial render
    // useEffect(() => {
    //     const storedTelepersonUser = localStorage.getItem("teleperson-user");

    //     if (storedTelepersonUser) {
    //         try {
    //             const parsedUser = JSON.parse(storedTelepersonUser);
    //             setTelepersonUser(parsedUser);
    //         } catch (error) {
    //             console.error("Error parsing teleperson user from localStorage:", error);
    //             localStorage.removeItem("teleperson-user");
    //         }
    //     } else {
    //         // ! DELETE THIS IN PRODUCTION
    //         // If no user in localStorage, fetch with default email for development
    //         fetchTelepersonUserData("jesse@teleperson.com");
    //     }
    // }, []);

    // * Fetch user data and vendors from Teleperson API
    const fetchTelepersonUserData = async (email) => {
        try {
            const response = await fetch("/api/user", {
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
                lastName: userData.user.lastName,
                vendors: userData.vendors.map((vendor) => vendor.companyName),
            };

            // Save to localStorage and update state
            localStorage.setItem("teleperson-user", JSON.stringify(formattedUser));
            setTelepersonUser(formattedUser);

            // Fetch previous conversations if we have a user ID
            if (formattedUser.id) {
                const conversationsResponse = await fetch(
                    `/api/user/${formattedUser.id}/conversations`
                );
                if (conversationsResponse.ok) {
                    const conversationsData = await conversationsResponse.json();
                    if (conversationsData.success) {
                        setPreviousConversations(conversationsData.data.llmFormat);
                    }
                }
            }

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
        sessionStorage.setItem("wa-thread", JSON.stringify(initialMessages));
        sessionStorage.removeItem("wa-conversationID");

        setMessages(initialMessages);
        setData(undefined);
        setConversationID(null);
    };

    useEffect(() => {
        if (!isLoading && messages.length > props.initialMessages.length) {
            sessionStorage.setItem("wa-thread", JSON.stringify(messages));
        }
    }, [isLoading]);

    useEffect(() => {
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

            sessionStorage.setItem("wa-conversationID", data.conversationID);
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
