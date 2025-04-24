// import { createClient } from "@/app/lib/supabase/server";
import { createClient } from "@/lib/supabase/admin";
import ChatbotTest from "./_components/ChatbotTest";
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

export const maxDuration = 45;
export const dynamic = "force-dynamic";
export const revalidate = 0;

const chatbotID = "e5f6ee19-c047-4391-81d0-ca3af5e9af8e";

export default async function Sandbox() {
    const supabase = await createClient();

    const chatbotSettings = await fetchChatbotSettings(supabase, chatbotID);
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
        environment: "sandbox",
    };

    return (
        <div>
            <ChatbotTest settings={settings} initialMessages={initialMessages} />
        </div>
    );
}
