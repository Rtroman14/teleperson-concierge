import { XMarkIcon } from "@heroicons/react/24/outline";
import { colord } from "colord";
import { cn } from "@/lib/utils";

// import Favicon from "../Favicon";

export default function ChatBubble({
    accentColor,
    iconColor,
    open,
    handleClickChatbotBubble,
    showPopup,
    darkTheme = false,
    welcomeMessage,
}) {
    const hslColor = colord(accentColor).toHsl();

    return (
        <div className="relative">
            <div
                onClick={handleClickChatbotBubble}
                className={cn(
                    "absolute bottom-[60px] right-0 w-[300px] cursor-pointer rounded-lg p-[12px] text-sm shadow-lg",
                    darkTheme ? "bg-slate-700 text-white" : "bg-white text-black",
                    showPopup && !open ? "block" : "hidden"
                )}
            >
                {welcomeMessage}
            </div>

            <button
                aria-label="Chat Widget"
                onClick={handleClickChatbotBubble}
                className={`mt-3 rounded-full p-[10px] duration-100 hover:scale-110 active:scale-100`}
                style={{
                    backgroundImage: `linear-gradient(135deg, hsl(${hslColor.h}, ${hslColor.s}%, 85%, 1), ${accentColor})`,
                    color: iconColor,
                }}
            >
                {open ? (
                    <XMarkIcon className="h-[30px] w-[30px]" />
                ) : (
                    // <div className="overflow-hidden rounded-full">
                    //     <img
                    //         src="https://api.webagent.ai/storage/v1/object/public/logos/90bfc6b8-a8ed-41e7-9ba7-e18bab6725a7/chatbots/e4740412-0b5c-4e9a-b402-4d4d198de908/logo"
                    //         alt="Chat Icon"
                    //         width="29"
                    //         height="29"
                    //     />
                    // </div>
                    // <Favicon option={9} color={iconColor} size="29" />
                    <div></div>
                )}
            </button>
        </div>
    );
}
