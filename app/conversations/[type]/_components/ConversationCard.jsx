"use client";

import { useContext } from "react";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { EnvelopeIcon, EnvelopeOpenIcon } from "@heroicons/react/24/outline";
import { ConversationContext } from "@/context/conversationContext";
import ConversationCardLoading from "./ConversationCardLoading";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export default function ConversationCard({ id, name, messagePreview, time, closed }) {
    const {
        handleSelectConversation,
        selectedConversation,
        actionLoading,
        checkedConversations,
        handleCheckConversation,
    } = useContext(ConversationContext);

    if (actionLoading && (selectedConversation.id === id || checkedConversations.includes(id))) {
        return <ConversationCardLoading />;
    }

    return (
        <div
            onClick={() => handleSelectConversation(id)}
            className={cn(
                "group w-[280px] cursor-pointer rounded-md border px-2 py-3 hover:border-primary/10 hover:bg-primary/10 dark:border-border dark:hover:border-gray-500",
                selectedConversation.id === id || checkedConversations.includes(id)
                    ? "border-primary/10 bg-primary/10 dark:border-gray-500"
                    : "border border-gray-300 dark:border-border"
            )}
        >
            <div className="flex w-full space-x-3">
                <div>
                    <UserCircleIcon
                        className={cn(
                            "h-10 w-10 text-slate-400 duration-100 group-hover:dark:text-white",
                            selectedConversation.id === id || checkedConversations.includes(id)
                                ? "dark:text-white"
                                : ""
                        )}
                    />
                </div>
                <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            {closed ? (
                                <EnvelopeOpenIcon className="h-3 w-3" />
                            ) : (
                                <EnvelopeIcon className="h-3 w-3" />
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {name.length > 20 ? `${name.slice(0, 20)}...` : name}
                            </span>
                        </div>
                    </div>

                    <p className="line-clamp-1 break-all text-start text-xs text-gray-500 dark:text-gray-400">
                        {messagePreview}
                    </p>
                </div>

                <div className="relative">
                    <div
                        className={cn(
                            checkedConversations.includes(id)
                                ? "absolute hidden"
                                : "w-max text-xs text-gray-500 group-hover:opacity-0",
                            selectedConversation.id === id || checkedConversations.includes(id)
                                ? "dark:text-white"
                                : ""
                        )}
                    >
                        {time}
                    </div>
                    <Checkbox
                        className={cn(
                            "z-50 bg-white",
                            checkedConversations.includes(id)
                                ? "block"
                                : "absolute right-0 top-0 hidden group-hover:block"
                        )}
                        checked={checkedConversations.includes(id)}
                        onCheckedChange={() => handleCheckConversation(id)}
                    />
                </div>
            </div>
        </div>
    );
}
