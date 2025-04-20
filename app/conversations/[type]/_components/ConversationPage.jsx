"use client";

import ConversationList from "./ConversationList";
import ConversationThread from "./ConversationThread";
import ConversationButtons from "./ConversationButtons";

import { ConversationProvider } from "@/context/conversationContext";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ConversationPage({ conversations, numSelected, pageSize }) {
    return (
        <ConversationProvider
            conversations={conversations}
            numSelected={numSelected}
            pageSize={pageSize}
        >
            <div className="flex flex-col h-screen">
                <div className="flex-none bg-card">
                    <ConversationButtons />
                </div>
                <div className="flex grow bg-background">
                    <ScrollArea
                        id="conversations"
                        className="max-h-[calc(100vh-64px-49px)] overflow-visible border-r border-border bg-card"
                    >
                        <ConversationList />
                    </ScrollArea>

                    <ScrollArea
                        id="conversation-thread"
                        className="max-h-[calc(100vh-64px-49px)] w-full"
                    >
                        <ConversationThread />
                    </ScrollArea>
                </div>
            </div>
        </ConversationProvider>
    );
}
