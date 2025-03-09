import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/admin";

// Format conversation for LLM
const formatForLLM = (conversations) => {
    return conversations
        .map((conversation) => {
            const date = new Date(conversation.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });

            const header = `──────────────────────────────────\nConversation (Created at: ${date}):`;

            // Sort messages by creation date
            const sortedMessages = conversation.messages
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                .map((message) => {
                    // Replace 'user' with contact's first name if available
                    let role = message.role;
                    if (role === "user" && conversation.contact_id?.first_name) {
                        role = conversation.contact_id.first_name;
                    }
                    return `${role.charAt(0).toUpperCase() + role.slice(1)}: ${message.content}`;
                })
                .join("\n");

            return `${header}\n${sortedMessages}`;
        })
        .join("\n");
};

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const supabase = await createClient();

        // Fetch the last 3 conversations for this user
        const { data: conversations, error: conversationsError } = await supabase
            .from("conversations")
            .select(
                `
                id,
                created_at,
                messages (
                    role,
                    content,
                    created_at
                ),
                contact_id (
                    first_name
                )
            `
            )
            .eq("contact_id", id)
            .order("created_at", { ascending: false })
            .limit(1);

        if (conversationsError) {
            console.error("Error fetching conversations:", conversationsError);
            return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
        }

        // Format the response
        const formattedConversations = conversations.map((conversation) => ({
            id: conversation.id,
            created_at: conversation.created_at,
            messages: conversation.messages.map((message) => ({
                id: message.id,
                created_at: message.created_at,
                content: message.content,
                role: message.role,
            })),
        }));

        // Format for LLM
        const llmFormat = formatForLLM(conversations);

        return NextResponse.json({
            success: true,
            data: { formattedConversations, llmFormat },
        });
    } catch (error) {
        console.error("Error in conversations route:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
