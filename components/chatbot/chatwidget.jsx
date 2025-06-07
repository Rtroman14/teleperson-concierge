"use client";

import Header from "./header";
import Content from "./content";
import Footer from "./footer";
import { cn } from "@/lib/utils";
import SalesFooter from "./footer.sales";
import ChatBubble from "./chatbubble";

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
    showPopup = false,
    darkTheme = false,
    disclaimer = { display: false, title: "", description: "" },
    messages,
    isLoading,
    handleInputChange,
    handleSubmit,
    input,
    conversationID,
    isPublic,
    environment = "sandbox",
}) {
    return (
        <>
            <div
                className={cn(
                    "chatwidget overflow-hidden shadow-xl flex h-screen flex-col overflow-y-auto",
                    open ? "" : "hidden",
                    darkTheme ? "bg-slate-800" : "bg-white",
                    environment === "sandbox"
                        ? "rounded-2xl sm:h-[82vh] sm:max-h-[780px]"
                        : "flex h-screen flex-col overflow-y-auto"
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
                            environment={environment}
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

            {environment === "sandbox" ? (
                <div className={cn("w-full justify-end", open ? "hidden sm:flex" : "flex")}>
                    <ChatBubble
                        accentColor={accentColor}
                        iconColor={textColor}
                        open={open}
                        handleClickChatbotBubble={handleClickChatbotBubble}
                        darkTheme={darkTheme}
                        showPopup={showPopup}
                        // welcomeMessage={welcomeMessage}
                    />
                </div>
            ) : null}
        </>
    );
}
