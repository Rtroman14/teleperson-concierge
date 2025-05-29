"use client";

import { cn } from "@/lib/utils";
import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function CalMessage({ className = "", darkMode, url }) {
    useEffect(() => {
        (async function () {
            const cal = await getCalApi({ namespace: "30min" });
            cal("ui", {
                theme: "dark",
                cssVarsPerTheme: {
                    light: { "cal-brand": "#1D957D" },
                    dark: { "cal-brand": "#1D957D" },
                },
                hideEventTypeDetails: true,
                layout: "month_view",
            });
        })();
    }, []);

    return (
        <div className={cn("chat chat-start drop-shadow-md", className)}>
            <div
                className={cn(
                    "text-md chat-bubble !w-[90%] py-4",
                    darkMode ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-800"
                )}
            >
                <Cal
                    namespace="30min"
                    calLink="teleperson/30min"
                    style={{ width: "100%", height: "100%", overflow: "scroll" }}
                    config={{ layout: "month_view", theme: "dark" }}
                />
            </div>
        </div>
    );
}
