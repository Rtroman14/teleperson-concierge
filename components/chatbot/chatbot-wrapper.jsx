"use client";

import ChatWidget from "./chatwidget";
import _ from "@/lib/Helpers";

import { ChatProvider, useChatContext } from "@/context/ChatContext";
import {
    ChatProvider as SalesChatbotProvider,
    useChatContext as useSalesChatContext,
} from "@/context/ChatContext.sales";

export default function TelepersonChatbot({ environment, settings, initialMessages }) {
    const Provider = environment === "public" ? SalesChatbotProvider : ChatProvider;

    return (
        <Provider
            environment={environment}
            widgetType="ChatWidget"
            initialSettings={settings}
            initialMessages={initialMessages}
        >
            <ChatbotContent isPublic={environment === "public"} />
        </Provider>
    );
}

function ChatbotContent({ isPublic }) {
    const context = isPublic ? useSalesChatContext() : useChatContext();
    const {
        chatbotSettings,
        messages,
        isLoading,
        handleInputChange,
        handleSubmit,
        input,
        handleRefresh,
        setData,
        conversationID,
    } = context;

    return (
        <ChatWidget
            id={chatbotSettings.id}
            conversationID={conversationID}
            open={true}
            title={chatbotSettings.title}
            subheading={chatbotSettings.subheading}
            logoUrl={chatbotSettings.logo_url}
            reset={handleRefresh}
            suggestedQuestions={chatbotSettings.suggested_questions}
            inputPlaceholder={chatbotSettings.input_placeholder}
            accentColor={chatbotSettings.accent_color}
            textColor={chatbotSettings.text_color}
            isLoading={isLoading}
            messages={messages}
            darkTheme={chatbotSettings.is_dark}
            showPopup={chatbotSettings.show_popup}
            disclaimer={chatbotSettings.disclaimer}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            input={input}
            setData={setData}
            isPublic={isPublic}
            environment="public"
        />
    );
}
