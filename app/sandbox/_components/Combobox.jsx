"use client";

import { useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { RefreshCcw } from "lucide-react";
import { useUIState, useActions, useAIState } from "ai/rsc";
import { nanoid } from "nanoid";
import { cn } from "@/app/lib/utils";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import Content from "@/app/components/DocWidget/Content";
import UserMessage from "@/app/components/DocWidget/UserMessage";
import BotMessage from "@/app/components/DocWidget/BotMessage";

const Footer = ({ settings, darkMode }) => {
    return (
        <div className="px-12 pt-4">
            <div className="relative h-[70px]">
                <textarea
                    className={cn(
                        "focus:border-1 absolute h-full w-full resize-none rounded-lg border-2 p-2 pr-20 duration-100 focus:bg-transparent",
                        darkMode
                            ? "border-slate-600 bg-slate-950 text-white hover:bg-slate-600 focus:bg-slate-900"
                            : "border-[#E2E8F0] bg-[#EDF2F7] text-black hover:bg-[#E2E8F0] focus:bg-transparent"
                    )}
                    type="text"
                    placeholder="Ask me anything..."
                    value={settings.question}
                    onChange={settings.onQuestionChange}
                    onKeyDown={settings.onKeyDown}
                />

                <div
                    className="absolute right-0 z-[9999999] mr-2"
                    style={{
                        top: "50%",
                        transform: "translate(0, -50%)",
                    }}
                >
                    <button
                        aria-label="Send Question"
                        onClick={settings.onSubmit}
                        disabled={!settings.question || settings.isResponding}
                    >
                        <PaperAirplaneIcon
                            className={`h-6 w-6 duration-100 ${
                                settings.question && !settings.isResponding
                                    ? "cursor-pointer text-blue-500 hover:scale-110"
                                    : "text-gray-300"
                            }`}
                        />
                    </button>
                </div>
            </div>
            <div className="p-0.5">
                {settings.powered_by.name === "" ? (
                    <div className="m-[8px]"> </div>
                ) : (
                    <p
                        className={cn(
                            "m-[3px] text-center text-[12px]",
                            darkMode ? "text-slate-400" : "text-slate-500"
                        )}
                    >
                        Powered by{" "}
                        <a
                            href={settings.powered_by.url}
                            target="_blank"
                            className={cn(
                                " duration-200 ",
                                darkMode
                                    ? "text-slate-300 underline-offset-1 hover:text-slate-100 hover:underline"
                                    : "text-blue-500 hover:text-blue-700"
                            )}
                        >
                            {settings.powered_by.name}
                        </a>
                    </p>
                )}
            </div>
        </div>
    );
};

export const Combobox = ({ settings, initialMessages }) => {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useUIState();
    const { submitUserMessage } = useActions();
    const [aiState, setAIState] = useAIState();
    const [userSentMessage, setUserSentMessage] = useState(false);

    const darkMode = settings.is_dark;

    const handleSelectDefaultQuestion = async (selectedQuestion) => {
        setQuestion("");

        await sendMessage(selectedQuestion);
    };

    const handleSubmit = async () => {
        setQuestion("");

        await sendMessage(question);
    };

    const sendMessage = async (question) => {
        setUserSentMessage(true);

        // Add user message to UI state
        setMessages((currentMessages) => [
            ...currentMessages,
            {
                id: nanoid(),
                display: (
                    <UserMessage
                        accentColor={settings.accent_color}
                        textColor={settings.text_color}
                        darkMode={darkMode}
                    >
                        {question}
                    </UserMessage>
                ),
            },
        ]);
        setAIState((prevState) => ({
            ...prevState,
            thinking: true,
            responding: true,
        }));

        // Submit and get response message
        const responseMessage = await submitUserMessage(question);

        setAIState((prevState) => ({
            ...prevState,
            thinking: false,
        }));

        setMessages((currentMessages) => [...currentMessages, responseMessage]);
    };

    const reset = () => {
        setUserSentMessage(false);

        // localStorage.setItem("wa-thread", JSON.stringify(initialMessages));
        // localStorage.removeItem("wa-conversationID");

        setAIState((prevAIState) => ({
            ...prevAIState,
            conversationID: undefined,
            messages: initialMessages,
            messagesToSave: [initialMessages[0].id],
            thinking: false,
            responding: false,
        }));

        setMessages(() =>
            initialMessages.map((message) => ({
                id: nanoid(),
                display:
                    message.role === "assistant" ? (
                        <BotMessage content={message.content} darkMode={darkMode} />
                    ) : (
                        <UserMessage
                            accentColor={settings.accent_color}
                            textColor={settings.text_color}
                            darkMode={darkMode}
                        >
                            {message.content}
                        </UserMessage>
                    ),
            }))
        );
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="w-full flex-1 md:w-auto md:flex-none">
                    <button className="relative inline-flex h-8 w-full items-center justify-start whitespace-nowrap rounded-[0.5rem] border border-input bg-background px-4 py-2 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:pr-12 md:w-40 lg:w-64">
                        <SparklesIcon className="mr-1.5 h-4 w-4" />
                        <span className="inline-flex">Chat with AI...</span>
                        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </button>
                </div>
            </DialogTrigger>

            <DialogContent
                className={cn(
                    "!top-[100px] mx-4 w-[90vw] max-w-[800px] translate-y-0 gap-0 rounded-xl p-0 px-4 pt-6",
                    darkMode ? "border-slate-600 bg-slate-800" : "bg-slate-50"
                )}
            >
                {/* <DialogHeader>
                    {settings.title ? (
                        <DialogTitle
                            className={cn(
                                "heading-font flex justify-center text-[22px] font-semibold leading-none tracking-tight xs:text-[25px]",
                                darkMode ? "text-white" : "text-black"
                            )}
                        >
                            {settings.title}
                        </DialogTitle>
                    ) : (
                        <DialogDescription></DialogDescription>
                    )}

                    {settings.subheading ? (
                        <DialogDescription
                            className={cn("text-center", darkMode ? "text-slate-300" : "")}
                        >
                            {settings.subheading}
                        </DialogDescription>
                    ) : (
                        <DialogDescription></DialogDescription>
                    )}
                </DialogHeader> */}
                <DialogHeader>
                    <DialogTitle></DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>

                <button
                    onClick={reset}
                    className="absolute right-10 top-[1.1rem] z-50 cursor-pointer rounded-sm opacity-70 transition-opacity hover:opacity-100"
                >
                    <RefreshCcw size="12" className={cn(darkMode ? "text-white" : "text-black")} />
                </button>

                <Content
                    darkTheme={darkMode}
                    suggestedQuestions={settings.suggested_questions}
                    handleSelectDefaultQuestion={handleSelectDefaultQuestion}
                    userSentMessage={userSentMessage}
                    darkMode={darkMode}
                />

                <Footer
                    settings={{
                        question,
                        onQuestionChange: (event) => setQuestion(event.target.value),
                        onKeyDown: (event) => {
                            if (event.key === "Enter" && !aiState.responding) {
                                event.preventDefault();
                                handleSubmit();
                            }
                        },
                        onSubmit: handleSubmit,
                        isResponding: aiState.responding,
                        powered_by: settings.powered_by,
                    }}
                    darkMode={darkMode}
                />
            </DialogContent>
        </Dialog>
    );
};
