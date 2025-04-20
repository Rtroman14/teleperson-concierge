"use client";

import { createContext, useState } from "react";
import { conversationsByStatus, deleteRecords } from "@/app/_actions/common";
import { useParams } from "next/navigation";

export const ConversationContext = createContext();

export function ConversationProvider(props) {
    // const { id: chatbotID } = useParams();
    const params = useParams();

    const chatbotID =
        params.type === "sales"
            ? "e5f6ee19-c047-4391-81d0-ca3af5e9af8e"
            : "fb0b48ba-9449-4e83-bc51-43e2651e3e16";

    const [loading, setLoading] = useState(false);
    const [loadMore, setLoadMore] = useState(false);
    const [page, setPage] = useState(0);
    const [actionLoading, setActionLoading] = useState(false);
    const [conversations, setConversations] = useState(props.conversations);
    const [selectedConversation, setSelectedConversation] = useState(
        props.conversations[0] || null
    );
    const [selected, setSelected] = useState("Unread");
    const [numSelected, setNumSelected] = useState(props.numSelected);

    const handleSelectConversation = (id) => {
        const matchedConversation = conversations.find((conversation) => conversation.id === id);
        setSelectedConversation(matchedConversation);
    };

    const [checkedConversations, setCheckedConversations] = useState([]);

    const handleCheckConversation = (id) => {
        if (checkedConversations.includes(id)) {
            const filteredOutConversation = checkedConversations.filter(
                (convoID) => convoID !== id
            );
            setCheckedConversations(filteredOutConversation);
        } else {
            setCheckedConversations([...checkedConversations, id]);
        }
    };

    const fetchMoreConversations = async () => {
        setLoadMore(true);
        const conversationsRes = await conversationsByStatus({
            chatbotID,
            status: selected,
            page: page + 1,
            pageSize: props.pageSize,
        });
        setLoadMore(false);
        setPage(page + 1);

        if (conversationsRes.success) {
            const conversationsToDelete = conversationsRes.data
                .filter((convo) => !convo.messages.length)
                .map((convo) => convo.id);

            if (conversationsToDelete.length) {
                await deleteRecords("conversations", conversationsToDelete);
            }

            const filteredConversations = conversationsRes.data.filter(
                (convo) => convo.messages.length
            );
            setConversations([...conversations, ...filteredConversations]);
            setNumSelected(conversationsRes.count - conversationsToDelete.length);
        }
    };

    return (
        <ConversationContext.Provider
            value={{
                page,
                setPage,
                handleSelectConversation,
                conversations,
                selectedConversation,
                setConversations,
                loadMore,
                setLoadMore,
                loading,
                setLoading,
                setSelectedConversation,
                actionLoading,
                setActionLoading,
                selected,
                setSelected,
                conversationsByStatus,
                numSelected,
                setNumSelected,
                checkedConversations,
                handleCheckConversation,
                setCheckedConversations,
                fetchMoreConversations,
            }}
        >
            {props.children}
        </ConversationContext.Provider>
    );
}
