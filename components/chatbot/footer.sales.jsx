"use client";

import { PaperAirplaneIcon, StopIcon } from "@heroicons/react/24/solid";
import { PhoneArrowUpRightIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";
import ReactSiriwave from "react-siriwave";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatContext as useSalesChatbotContext } from "@/context/ChatContext.sales";
import { useChatContext as useDemoChatbotContext } from "@/context/ChatContext.demo";

export default function SalesFooter({
    inputPlaceholder,
    suggestedQuestions,
    darkTheme,
    handleInputChange,
    handleSubmit,
    isLoading,
    input,
    environment,
}) {
    // Call both hooks to satisfy React rules of hooks
    const salesContext = useSalesChatbotContext();
    const demoContext = useDemoChatbotContext();
    // Select the correct context based on environment
    const { handleCall, endCall, isCallActive, connecting, connected, volumeLevel } =
        environment === "public" ? salesContext : demoContext;

    const hasSuggestedQuestions = suggestedQuestions.length && suggestedQuestions[0] !== "";

    const handleSelectDefaultQuestion = (selectedQuestion) => {
        const changeEvent = {
            target: { value: selectedQuestion },
        };
        handleInputChange(changeEvent);

        setTimeout(() => {
            const form = document.querySelector("#chat-form");
            const submitEvent = new Event("submit", {
                bubbles: true,
                cancelable: true,
            });
            form.dispatchEvent(submitEvent);
        }, 0);
    };

    // Siri wave configuration
    const siriWaveConfig = {
        theme: "ios9",
        ratio: 1,
        // speed: isCallActive ? (volumeLevel > 0.01 ? volumeLevel * 7.5 : 0.2) : 0.2,
        // amplitude: isCallActive ? (volumeLevel > 0.01 ? volumeLevel * 7.5 : 1) : 1,
        speed: isCallActive ? (volumeLevel > 0.01 ? volumeLevel * 3 : 0.2) : 0.2,
        amplitude: isCallActive ? (volumeLevel > 0.01 ? volumeLevel * 12 : 1) : 1,
        frequency: isCallActive ? (volumeLevel > 0.01 ? volumeLevel * 5 : 6) : 6,
        color: darkTheme ? "#fff" : "#3B82F6",
        cover: true,
        width: 800,
        height: 70,
        autostart: true,
        pixelDepth: 1,
        lerpSpeed: 0.1,
    };

    return (
        <div
            className={cn(
                "z-10 pt-2",
                darkTheme
                    ? "shadow-[0_4px_5px_6px_rgba(255,255,255,0.1)]"
                    : "shadow-[0_4px_5px_6px_rgba(0,0,0,0.1)]"
            )}
        >
            <div className="pl-2">
                <div
                    className={cn(
                        "flex overflow-x-auto",
                        darkTheme ? "scrollbar-dark" : "scrollbar-light",
                        hasSuggestedQuestions ? "pb-2 pt-1" : ""
                    )}
                >
                    {hasSuggestedQuestions
                        ? suggestedQuestions.map((suggestedQuestion, index) => (
                              <Button
                                  aria-label="Question"
                                  key={`question-${index}`}
                                  onClick={() => {
                                      handleSelectDefaultQuestion(suggestedQuestion);
                                  }}
                                  disabled={isLoading}
                                  className={cn(
                                      "mr-2 w-max whitespace-nowrap border text-xs font-normal shadow-none duration-100",
                                      darkTheme
                                          ? "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-700"
                                          : "!border-[#cfd1d8] !bg-[#F3F4F6] !text-slate-700 hover:shadow"
                                  )}
                                  size="xs"
                              >
                                  {suggestedQuestion}
                              </Button>
                          ))
                        : null}
                </div>
            </div>

            <div className="relative mx-2 mb-2 mt-2 h-[70px]">
                <form onSubmit={handleSubmit} id="chat-form">
                    <textarea
                        name="prompt"
                        className={cn(
                            "border-1 focus:border-1 absolute h-full w-full resize-none rounded-lg border-transparent p-2 pr-20 duration-200 focus:bg-transparent",
                            darkTheme
                                ? "bg-slate-950 text-white hover:bg-slate-900 focus:bg-slate-900"
                                : "bg-[#EDF2F7] text-black hover:bg-[#E2E8F0] focus:bg-transparent"
                        )}
                        placeholder={inputPlaceholder}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey && !isLoading) {
                                event.preventDefault();
                                handleSubmit(event);
                            }
                        }}
                    />

                    {/* Siri Wave Overlay */}
                    {connected && (
                        <div
                            className={cn(
                                "absolute inset-0 flex items-center justify-center",
                                darkTheme ? "bg-slate-800" : "bg-white"
                            )}
                        >
                            <div className="flex h-full w-3/5 justify-center">
                                <ReactSiriwave {...siriWaveConfig} />
                            </div>
                        </div>
                    )}

                    <div
                        className="absolute right-0 z-[9999999] mr-2 flex items-center gap-2"
                        style={{
                            top: "50%",
                            transform: "translate(0, -50%)",
                        }}
                    >
                        {/* <button
                            type="submit"
                            aria-label="Send Question"
                            disabled={!input || isLoading}
                        >
                            <PaperAirplaneIcon
                                className={cn(
                                    "h-6 w-6 duration-100",
                                    input && !isLoading
                                        ? darkTheme
                                            ? "cursor-pointer text-white hover:scale-110"
                                            : "cursor-pointer text-blue-500 hover:scale-110"
                                        : "text-gray-300",
                                    darkTheme ? "" : "text-slate-700" ? !input || isLoading : ""
                                )}
                            />
                        </button> */}

                        <button
                            type="button"
                            aria-label={isCallActive ? "Stop Voice Input" : "Start Voice Input"}
                            onClick={isCallActive ? () => endCall() : () => handleCall()}
                            disabled={connecting}
                        >
                            {connecting ? (
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                            ) : isCallActive ? (
                                <StopIcon
                                    className={cn(
                                        "h-6 w-6 duration-100",
                                        darkTheme
                                            ? "cursor-pointer text-red-500 hover:scale-110"
                                            : "cursor-pointer text-red-500 hover:scale-110"
                                    )}
                                />
                            ) : (
                                <PhoneArrowUpRightIcon
                                    className={cn(
                                        "h-6 w-6 duration-100",
                                        darkTheme
                                            ? "cursor-pointer text-white hover:scale-110"
                                            : "cursor-pointer text-blue-500 hover:scale-110"
                                    )}
                                />
                            )}
                        </button>

                        {connected ? null : (
                            <button
                                type="submit"
                                aria-label="Send Question"
                                disabled={!input || isLoading}
                            >
                                <PaperAirplaneIcon
                                    className={cn(
                                        "h-6 w-6 duration-100",
                                        input && !isLoading
                                            ? darkTheme
                                                ? "cursor-pointer text-white hover:scale-110"
                                                : "cursor-pointer text-blue-500 hover:scale-110"
                                            : "text-gray-300",
                                        darkTheme ? "" : "text-slate-700" ? !input || isLoading : ""
                                    )}
                                />
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
