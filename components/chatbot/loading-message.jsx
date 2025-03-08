import { cn } from "@/lib/utils";

export default function LoadingMessage({ darkTheme }) {
    return (
        <div className="pl-2 pt-1">
            <ul
                className={cn(
                    "tp-loader tp-loader--small rounded-xl p-4 drop-shadow-md",
                    darkTheme ? "bg-slate-700" : "bg-gray-100"
                )}
            >
                <li className={cn(darkTheme ? "bg-gray-300" : "bg-gray-500")}></li>
                <li className={cn(darkTheme ? "bg-gray-300" : "bg-gray-500")}></li>
                <li className={cn(darkTheme ? "bg-gray-300" : "bg-gray-500")}></li>
            </ul>
        </div>
    );
}
