"use client";

import Markdown from "markdown-to-jsx";
import { cn } from "@/lib/utils";
import { markdownOptions } from "@/lib/markdownOptions";

// import LeadCaptureForm from "../LeadCaptureForm";

export default function Message({ message, role, footer = null }) {
    return (
        <div
            className={cn("chat drop-shadow-md", role === "assistant" ? "chat-start " : "chat-end")}
        >
            <div
                className={cn(
                    "text-md chat-bubble ",
                    role === "assistant"
                        ? "max-w-[70%] bg-white text-gray-800 antialiased dark:bg-slate-700 dark:text-white"
                        : "chat-bubble-primary max-w-[70%]"
                )}
            >
                <Markdown options={markdownOptions}>{message}</Markdown>
            </div>
            {footer ? <div className="chat-footer mt-1 text-xs opacity-50">{footer}</div> : null}
        </div>
    );
}
