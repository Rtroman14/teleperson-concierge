"use client";

import { InlineWidget } from "react-calendly";
import { cn } from "@/lib/utils";

// export default function Calendly({ className = "", url }) {
//     return (
//         <div className={cn("chat chat-start drop-shadow-md", className)}>
//             <div className={cn("!w-[80%] mx-auto py-4")}>
//                 <InlineWidget url={url} />
//             </div>
//         </div>
//     );
// }

export default function Calendly({ className = "", darkMode, url }) {
    return (
        <div className={cn("chat chat-start drop-shadow-md", className)}>
            <div
                className={cn(
                    "text-md chat-bubble !w-[90%] py-4",
                    darkMode ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-800"
                )}
            >
                <InlineWidget
                    url={url}
                    // pageSettings={{
                    //     backgroundColor: "262626",
                    //     hideEventTypeDetails: false,
                    //     hideLandingPageDetails: false,
                    //     primaryColor: "3ecf8e",
                    //     textColor: "ffffff",
                    // }}
                    // styles={{ colorScheme: "light", height: "700px" }}
                />
            </div>
        </div>
    );
}
