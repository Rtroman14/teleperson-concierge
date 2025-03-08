"use client";

import { useEffect, memo } from "react";
// import { GravityScrollArea } from "react-gravity-scroll";

import LoadingMessage from "./loading-message";
import Sources from "./sources";
import { ChatMessage } from "./chat-message";

import { useAutoScroll } from "@/components/ui/use-auto-scroll";
import { ArrowDown } from "lucide-react";

// import { Toaster, toast } from "sonner";

const Content = memo(function Content({
    darkTheme,
    disclaimer,
    accentColor,
    textColor,
    messages,
    isLoading,
    conversationID,
}) {
    const { scrollRef } = useAutoScroll({
        offset: 20,
        smooth: true,
        content: messages,
    });

    // useEffect(() => {
    //     if (!conversationID && disclaimer.display) {
    //         const showDisclaimer = sessionStorage.getItem("wa-display-disclaimer") !== "false";

    //         if (showDisclaimer) {
    //             setTimeout(() => {
    //                 toast.message(disclaimer.title, {
    //                     description: disclaimer.description,
    //                     duration: Infinity,
    //                     id: "disclaimer-toast",
    //                 });

    //                 sessionStorage.setItem("wa-display-disclaimer", "false");
    //             }, 2000);
    //         }
    //     }

    //     return () => {
    //         toast.dismiss("disclaimer-toast");
    //     };
    // }, [conversationID]);

    let shouldShowLoader = false;
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === "assistant") {
            shouldShowLoader = !lastMessage.content || !lastMessage.content.trim();
        } else if (lastMessage.role === "user") {
            shouldShowLoader = isLoading;
        }
    }

    return (
        <div
            ref={scrollRef}
            className="relative flex flex-1 flex-col overflow-y-auto px-2 py-4 drop-shadow"
        >
            <div>
                {messages
                    .filter((message) => message.content?.length > 1)
                    .map((message, index) => {
                        const hasSources = message.annotations?.some(
                            (annotation) => annotation?.sources
                        );
                        const isLastMessage = messages[messages.length - 1].id === message.id;
                        const showSources = !(isLoading && isLastMessage) && !!hasSources;

                        return (
                            <div key={message.id || index}>
                                <ChatMessage
                                    id={message.id}
                                    role={message.role}
                                    accentColor={accentColor}
                                    textColor={textColor}
                                    darkMode={darkTheme}
                                    content={message.content}
                                />

                                {message.role === "assistant" && (
                                    <>
                                        {showSources && (
                                            <div className="ml-3">
                                                <Sources
                                                    darkTheme={darkTheme}
                                                    sources={
                                                        message.annotations.find(
                                                            (annotation) => annotation?.sources
                                                        )?.sources
                                                    }
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}

                {shouldShowLoader ? (
                    <div className="pt-1">
                        <LoadingMessage darkTheme={darkTheme} />
                    </div>
                ) : null}
            </div>
        </div>
    );
});

export default Content;
