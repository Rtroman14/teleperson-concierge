"use client";

import { useContext, useMemo } from "react";
import { format } from "date-fns";
import { ConversationContext } from "@/context/conversationContext";
import Message from "@/components/chatbot/Message";

const ConversationThread = () => {
    const { selectedConversation, loading } = useContext(ConversationContext);

    const groupedMessages = useMemo(() => {
        const messages = selectedConversation?.messages ?? [];

        // Sort messages by date
        const sortedMessages = messages.sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );

        // Group messages by date
        return sortedMessages.reduce((groups, message) => {
            const date = new Date(message.created_at);
            const dateString = format(date, "yyyy-MM-dd");

            if (!groups[dateString]) {
                groups[dateString] = [];
            }
            groups[dateString].push(message);
            return groups;
        }, {});
    }, [selectedConversation]);

    return (
        <div className="flex flex-1 flex-col justify-between overflow-y-auto">
            <div className="flex-1 px-2 py-4">
                {loading
                    ? null
                    : Object.entries(groupedMessages).map(([dateString, messages], groupIndex) => (
                          <div key={dateString}>
                              {groupIndex > 0 && (
                                  <div className="my-2 text-center text-sm text-gray-500">
                                      {format(new Date(dateString), "MMMM d, yyyy")}
                                  </div>
                              )}
                              {messages.map((message, index) => (
                                  <Message
                                      key={index}
                                      role={message.role}
                                      message={message.content}
                                      footer={format(new Date(message.created_at), "p")}
                                  />
                              ))}
                          </div>
                      ))}
            </div>
        </div>
    );
};

export default ConversationThread;
