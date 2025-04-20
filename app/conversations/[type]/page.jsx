import ConversationPage from "./_components/ConversationPage";
import { deleteRecords, conversationsByStatus } from "../../_actions/common";

const pageSize = 15;

export const dynamic = "force-dynamic";

export default async function Conversations({ params }) {
    const { type } = await params;

    const chatbotID =
        type === "sales"
            ? "e5f6ee19-c047-4391-81d0-ca3af5e9af8e"
            : "fb0b48ba-9449-4e83-bc51-43e2651e3e16";

    const conversations = await conversationsByStatus({
        chatbotID,
        status: "Unread",
        page: 0,
        pageSize,
    });

    if (!conversations.success) throw new Error(conversations.message);

    const conversationsToDelete = conversations.data
        .filter((convo) => !convo.messages.length)
        .map((convo) => convo.id);

    if (conversationsToDelete.length) {
        deleteRecords("conversations", conversationsToDelete);
    }

    const conversationList = conversations.data.filter((convo) => convo.messages.length);

    return (
        <ConversationPage
            conversations={conversationList}
            numSelected={conversations.count}
            pageSize={pageSize}
        />
    );
}
