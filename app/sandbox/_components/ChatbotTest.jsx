"use client";

import { ChatProvider, useChatContext } from "@/context/ChatContext";
import {
    ChatProvider as SalesChatbotProvider,
    useChatContext as useSalesChatContext,
} from "@/context/ChatContext.sales";
import ChatWidget from "@/components/chatbot/chatwidget";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import PageHeading from "@/components/page-heading";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import Tools from "./Tools";
import ModelSettings from "./ModelSettings";
import { WrenchIcon, SparklesIcon } from "@heroicons/react/24/outline";

// * IMPORTANT!! --> CHANGE sessionStorage to localStorage for ChatbotPublic

export default function ChatbotTest({ settings, initialMessages }) {
    const Provider = settings.environment !== "public" ? ChatProvider : SalesChatbotProvider;

    return (
        <Provider
            environment={settings.environment}
            widgetType="ChatWidget"
            initialSettings={settings}
            initialMessages={initialMessages}
        >
            <ChatbotTestContent isPublic={settings.environment === "public"} />
        </Provider>
    );
}

function ChatbotTestContent({ isPublic }) {
    const context = isPublic ? useSalesChatContext() : useChatContext();
    const {
        chatbotSettings,
        setChatbotSettings,
        messages,
        isLoading,
        handleInputChange,
        handleSubmit,
        input,
        handleRefresh,
        conversationID,
        open,
        setOpen,
    } = context;

    return (
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:gap-10 h-screen">
            <div className="flex w-full flex-1 justify-center bg-card">
                <ScrollArea className="h-full w-full p-4 !pt-0 shadow-lg md:p-6">
                    <PageHeading
                        title={`Chat with ${chatbotSettings.title}`}
                        subheading="Engage with your chatbot and see how it handles real conversation questions."
                    />
                    <Tabs defaultValue="model" className="mt-6">
                        <TabsList className="grid w-full grid-cols-2 bg-white shadow-md dark:bg-muted">
                            <TabsTrigger value="model">
                                <SparklesIcon className="mr-2 h-4 w-4" /> Model
                            </TabsTrigger>
                            <TabsTrigger value="tools" className="relative">
                                <WrenchIcon className="mr-2 h-4 w-4" /> Tools
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="model">
                            <ModelSettings
                                premiumModelAccess={true}
                                chatbot={chatbotSettings}
                                classNames="p-6"
                                setChatbotSettings={setChatbotSettings}
                            />
                        </TabsContent>
                        <TabsContent value="tools">
                            {/* <Tools
                                chatbot={chatbotSettings}
                                leadAccess={team.prod_id.leads_access}
                                classNames="p-6"
                                setChatbotSettings={setChatbotSettings}
                            /> */}
                        </TabsContent>
                    </Tabs>
                </ScrollArea>
            </div>

            <div className="flex flex-none items-center justify-center sm:items-end sm:justify-end sm:pb-5 sm:pr-5">
                <div className={cn("z-50 w-screen sm:bottom-[20px] sm:right-[20px] sm:w-[500px]")}>
                    <ChatWidget
                        id={chatbotSettings.id}
                        conversationID={conversationID}
                        open={open}
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
                        isPublic={isPublic}
                        handleClickChatbotBubble={() => setOpen(!open)}
                        environmen="sandbox"
                    />
                </div>
            </div>
        </div>
    );
}
