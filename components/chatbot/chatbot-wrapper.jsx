"use client";

import ChatWidget from "./chatwidget";
import _ from "@/lib/Helpers";

import { ChatProvider, useChatContext } from "@/context/ChatContext";
import {
    ChatProvider as SalesChatbotProvider,
    useChatContext as useSalesChatContext,
} from "@/context/ChatContext.sales";

import {
    ChatProvider as DemoChatbotProvider,
    useChatContext as useDemoChatContext,
} from "@/context/ChatContext.demo";

export default function TelepersonChatbot({
    environment,
    settings,
    initialMessages,
    industry = null,
}) {
    // Determine which provider to use based on environment
    let Provider;
    if (environment === "public") {
        Provider = SalesChatbotProvider;
    } else if (environment === "authenticated") {
        Provider = ChatProvider;
    } else if (environment === "demo") {
        Provider = DemoChatbotProvider;
    } else {
        // Default to authenticated environment
        Provider = SalesChatbotProvider;
    }

    return (
        <Provider
            environment={environment}
            widgetType="ChatWidget"
            initialSettings={settings}
            initialMessages={initialMessages}
            industry={industry}
        >
            <ChatbotContent environment={environment} />
        </Provider>
    );
}

function ChatbotContent({ environment }) {
    // Determine which context hook to use based on environment
    let context;
    if (environment === "public") {
        context = useSalesChatContext();
    } else if (environment === "authenticated") {
        context = useChatContext();
    } else if (environment === "demo") {
        context = useDemoChatContext();
    } else {
        // Default to authenticated environment
        context = useChatContext();
    }

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
            isPublic={environment === "public"}
            environment={environment}
        />
    );
}
