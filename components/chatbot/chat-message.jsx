import { memo, useMemo } from "react";
import { marked } from "marked";
import Markdown from "markdown-to-jsx";
import { markdownOptions } from "@/lib/markdownOptions";
import { cn } from "@/lib/utils";

function parseMarkdownIntoBlocks(markdown) {
    const tokens = marked.lexer(markdown);
    return tokens.map((token) => token.raw);
}

const MemoizedMarkdownBlock = memo(
    ({ content }) => {
        return <Markdown options={markdownOptions}>{content}</Markdown>;
    },
    (prevProps, nextProps) => {
        if (prevProps.content !== nextProps.content) return false;
        return true;
    }
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const ChatMessage = memo(({ content, id, accentColor, textColor, darkMode, role }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    if (role === "user") {
        return (
            <div className="chat chat-end drop-shadow-md">
                <div
                    className="text-md chat-bubble max-w-[70%]"
                    style={{ backgroundColor: accentColor, color: textColor }}
                >
                    {content &&
                        blocks.map((block, index) => (
                            <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
                        ))}
                </div>
            </div>
        );
    }

    return (
        <div className="chat chat-start drop-shadow-md">
            <div
                className={cn(
                    "text-md chat-bubble max-w-[70%]",
                    darkMode ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-800"
                )}
            >
                {content &&
                    blocks.map((block, index) => (
                        <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
                    ))}
            </div>
        </div>
    );
});

ChatMessage.displayName = "ChatMessage";
