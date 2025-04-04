import TelepersonChatbot from "@/components/chatbot/chatbot-wrapper";

import { createClient } from "@/lib/supabase/admin";
import { nanoid } from "@/lib/utils";

async function fetchChatbotSettings(supabase, chatbotID) {
    try {
        const { data, error } = await supabase
            .from("chatbot_settings")
            .select(
                `
                *,
                chatbots (
                    id,
                    name,
                    status,
                    prompt,
                    temperature,
                    model
                )
                `
            )
            .eq("chatbots_id", chatbotID)
            .limit(1)
            .single();

        if (error) {
            return {
                success: false,
                data: null,
                message: error,
            };
        }

        return { success: true, data };
    } catch (err) {
        console.error(err);

        return {
            success: false,
            data: [],
            message: err.message,
        };
    }
}

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TELEPERSON_CHATBOT_ID = "e5f6ee19-c047-4391-81d0-ca3af5e9af8e";

export default async function TelepersonChatbotPage() {
    const supabase = await createClient();

    const chatbotSettings = await fetchChatbotSettings(supabase, TELEPERSON_CHATBOT_ID);
    if (!chatbotSettings.success) throw new Error(chatbotSettings.message);

    const { chatbots: chatbot } = chatbotSettings.data;

    const initialMessageID = nanoid();
    const initialMessages = [
        {
            id: initialMessageID,
            role: "assistant",
            content: chatbotSettings.data.welcome_message,
        },
    ];

    const settings = {
        ...chatbotSettings.data,
        ...chatbot,
    };

    return (
        <div>
            <TelepersonChatbot
                environment="public"
                settings={settings}
                initialMessages={initialMessages}
            />
        </div>
    );
}
