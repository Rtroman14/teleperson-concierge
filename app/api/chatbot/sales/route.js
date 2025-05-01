import { NextResponse } from "next/server";
import { colord } from "colord";
import { createClient } from "@/lib/supabase/admin";

import generateScript from "./generateScript";

export async function GET(request) {
    const id = "e5f6ee19-c047-4391-81d0-ca3af5e9af8e";

    try {
        const supabase = await createClient();

        const { data: chatbotAppearance, error: chatbotAppearanceError } = await supabase
            .from("chatbot_settings")
            .select(
                "accent_color, text_color, show_popup, is_dark, welcome_message, host_domains, embedded_at"
            )
            .eq("id", id)
            .limit(1)
            .single();

        if (chatbotAppearanceError) throw chatbotAppearanceError;

        let accentColor = "#653aff";
        let textColor = "#ffffff";
        let accentColorHsl = { h: 253, s: 100, l: 61, a: 1 };
        let darkTheme = false;
        let showPopup = true;
        let welcomeMessage = "Hello there! 👋 How can I assist you today?";

        if (chatbotAppearance) {
            accentColor = chatbotAppearance.accent_color;
            textColor = chatbotAppearance.text_color;
            darkTheme = chatbotAppearance.is_dark;
            showPopup = chatbotAppearance.show_popup;
            welcomeMessage = chatbotAppearance.welcome_message;

            accentColorHsl = colord(accentColor).toHsl();
        }

        const scriptContent = generateScript({
            accentColor,
            accentColorHsl,
            textColor,
            darkTheme,
            showPopup,
            welcomeMessage,
        });

        // Create the response with the proper content type and the script content
        const response = new NextResponse(scriptContent, {
            headers: {
                "Content-Type": "application/javascript; charset=utf-8",
                "Permissions-Policy": "microphone=*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });

        return response;
    } catch (error) {
        console.error(error);
        return NextResponse.json({
            success: false,
            data: null,
            message: error.message,
        });
    }
}
