"use client";

import { useContext } from "react";
import { isToday, format, isYesterday } from "date-fns";
import { ConversationContext } from "@/context/conversationContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

import ConversationCard from "./ConversationCard";
import ConversationCardLoading from "./ConversationCardLoading";

export default function ConversationList() {
    const { conversations, loading, loadMore, numSelected, fetchMoreConversations } =
        useContext(ConversationContext);

    return (
        <div className="space-y-2 p-2">
            {loading ? (
                [...Array(10).keys()].map((el) => <ConversationCardLoading key={el} />)
            ) : (
                <>
                    {conversations.map((conversation) => {
                        const userMessage = conversation.messages.find(
                            (message) => message.role === "user"
                        );
                        let messagePreview = "";
                        let time = "";
                        const createdAt = new Date(conversation.created_at);

                        if (userMessage) {
                            messagePreview = userMessage.content;
                        }

                        if (isToday(createdAt)) {
                            time = format(createdAt, "p");
                        } else if (isYesterday(createdAt)) {
                            time = "Yesterday";
                        } else {
                            time = format(createdAt, "MMM do");
                        }

                        let conversationTitle = conversation.leads_id?.name ?? "Unknown User";
                        if (conversationTitle === "" || conversationTitle === "Unknown User") {
                            if (conversation.leads_id?.email) {
                                conversationTitle = conversation.leads_id.email;
                            }
                        }

                        return (
                            <ConversationCard
                                key={conversation.id}
                                id={conversation.id}
                                name={conversationTitle}
                                messagePreview={messagePreview}
                                time={time}
                                closed={conversation.closed}
                            />
                        );
                    })}

                    <div className="w-full min-w-[280px] text-center">
                        <Button
                            onClick={fetchMoreConversations}
                            className="w-full"
                            variant="outline"
                            size="sm"
                            disabled={
                                loadMore ||
                                conversations.length === 0 ||
                                numSelected <= conversations.length
                            }
                        >
                            {loadMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Load More
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
