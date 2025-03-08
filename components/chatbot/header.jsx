"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import { colord } from "colord";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Header({
    logoUrl,
    title,
    subheading,
    reset,
    accentColor,
    textColor,
    handleClose = () => {},
}) {
    const hslColor = colord(accentColor).toHsl();

    const closeChatbot = () => {
        handleClose();

        if (typeof window !== "undefined" && window.parent) {
            window.parent.postMessage("close-chatbot", "*");
        }
    };

    return (
        <div
            className="relative z-50 flex flex-col items-center justify-center gap-3 px-4 py-5 shadow xs:px-16 sm:p-6"
            style={{
                backgroundImage: `linear-gradient(345deg, hsl(${hslColor.h}, ${hslColor.s}%, 80%, 1), ${accentColor})`,
            }}
        >
            <div>
                <div className="flex items-center justify-center">
                    {logoUrl !== "" && (
                        <Image
                            className="mr-2"
                            src={logoUrl}
                            width={40}
                            height={40}
                            alt="Picture of the author"
                        />
                    )}
                    <div>
                        <h4
                            className="heading-font text-[24px] font-semibold leading-none tracking-tight xs:text-[25px]"
                            style={{ color: textColor }}
                        >
                            {title}
                        </h4>
                    </div>
                </div>
                <div className={cn("m-auto w-full", subheading ? "mt-1" : "")}>
                    <p
                        className="text-center text-sm tracking-tight [text-wrap:balance]"
                        style={{ color: textColor }}
                    >
                        {subheading}
                    </p>
                </div>
            </div>

            <div className="absolute right-0 top-0 transform p-3 sm:hidden">
                <div className="flex gap-3">
                    <button
                        id="webagent-close-chatbot"
                        aria-label="Close Chat"
                        onClick={closeChatbot}
                        className="block rounded-lg duration-200 hover:scale-125 sm:hidden"
                    >
                        <X size="24" color={textColor} />
                    </button>
                </div>
            </div>
            <Button
                aria-label="Refresh Chat"
                onClick={reset}
                size="sm"
                className="bg-slate-900/30 text-white duration-100 hover:bg-slate-900/40"
            >
                New Chat
            </Button>
        </div>
    );
}
