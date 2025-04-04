"use client";

import Header from "./header";
import Content from "./content";
import Footer from "./footer";
import { cn } from "@/lib/utils";
import SalesFooter from "./footer.sales";

export default function ChatWidget({
    title,
    subheading = "",
    logoUrl,
    open,
    reset,
    suggestedQuestions,
    inputPlaceholder,
    accentColor,
    textColor,
    handleClickChatbotBubble,
    darkTheme = false,
    disclaimer = { display: false, title: "", description: "" },
    messages,
    isLoading,
    handleInputChange,
    handleSubmit,
    input,
    conversationID,
    isPublic,
}) {
    return (
        <>
            <div
                className={cn(
                    "chatwidget overflow-hidden shadow-xl flex h-screen flex-col overflow-y-auto",
                    open ? "" : "hidden",
                    darkTheme ? "bg-slate-800" : "bg-white"
                )}
            >
                <div className="flex h-full flex-col overflow-y-auto">
                    <Header
                        accentColor={accentColor}
                        textColor={textColor}
                        logoUrl={logoUrl}
                        title={title}
                        subheading={subheading}
                        reset={reset}
                        handleClose={handleClickChatbotBubble}
                    />

                    <Content
                        darkTheme={darkTheme}
                        disclaimer={disclaimer}
                        accentColor={accentColor}
                        textColor={textColor}
                        messages={messages}
                        isLoading={isLoading}
                        conversationID={conversationID}
                    />
                    {isPublic ? (
                        <SalesFooter
                            inputPlaceholder={inputPlaceholder}
                            suggestedQuestions={suggestedQuestions}
                            darkTheme={darkTheme}
                            handleInputChange={handleInputChange}
                            handleSubmit={handleSubmit}
                            input={input}
                        />
                    ) : (
                        <Footer
                            inputPlaceholder={inputPlaceholder}
                            suggestedQuestions={suggestedQuestions}
                            darkTheme={darkTheme}
                            handleInputChange={handleInputChange}
                            handleSubmit={handleSubmit}
                            input={input}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
