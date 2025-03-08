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
                    model,
                    isPublic,
                    team_id (
                        id,
                        messages_sent,
                        num_messages_extra,
                        prod_id (
                            num_messages,
                            leads_access,
                            premium_model_access,
                            integration_access
                        )
                    ),
                    webhooks (id, url, event_type),
                    tools(id, name, description, args, active)
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

const TELEPERSON_CHATBOT_ID = "fb0b48ba-9449-4e83-bc51-43e2651e3e16";

export default async function TelepersonChatbotPage() {
    const supabase = await createClient();

    const chatbotSettings = await fetchChatbotSettings(supabase, TELEPERSON_CHATBOT_ID);
    if (!chatbotSettings.success) throw new Error(chatbotSettings.message);

    const { chatbots: chatbot } = chatbotSettings.data;
    const team = chatbot.team_id;

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
        team: {
            id: team.id,
            prod_id: team.prod_id,
        },
    };

    if (!chatbot.isPublic) {
        return (
            <section className="flex h-screen w-screen items-center justify-center bg-background px-12">
                <div className="mx-auto max-w-2xl text-center">
                    <h1 className="mb-4 text-4xl font-bold text-primary">
                        This Chatbot is Not Public
                    </h1>
                    <p className="mb-6 text-lg text-gray-600 dark:text-gray-400">
                        We're sorry, but this chatbot is currently not available for public use. If
                        you believe this is an error, please contact the chatbot owner.
                    </p>
                </div>
            </section>
        );
    }

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
