import { NextResponse } from "next/server";
import slackNotification from "@/lib/slackNotification";
import TelepersonAPIs from "@/lib/teleperson-apis";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req) {
    const body = await req.json();

    console.log(`body -->`, body);

    if (body.message.type !== "tool-calls") {
        return;
    }

    // Extract tool call information
    const toolCall = body.message.toolCalls[0];
    const { teleperson_user_id } = toolCall.function.arguments;
    const toolCallId = toolCall.id;

    console.log(`toolCall.function.arguments -->`, toolCall.function.arguments);

    try {
        if (!teleperson_user_id) {
            return "No user information available.";
        }

        const transactions = await TelepersonAPIs.fetchTransactions(teleperson_user_id);

        if (!transactions.success) {
            throw new Error("Unable to retrieve transaction information at this time.");
        }

        if (!transactions.data || transactions.data.length === 0) {
            return NextResponse.json({
                results: [
                    {
                        toolCallId: toolCallId,
                        result: "No transactions found for this user.",
                    },
                ],
            });
        }

        // Format transactions into a readable string
        const formattedTransactions = transactions.data
            .map((tx) => {
                const date = new Date(tx.transactedAt).toLocaleDateString();
                return `- ${date}: ${tx.description} - $${tx.amount} (${tx.type}) [${tx.category}]`;
            })
            .join("\n");

        return NextResponse.json({
            results: [
                {
                    toolCallId: toolCallId,
                    result: `Here are your recent transactions:\n${formattedTransactions}`,
                },
            ],
        });
    } catch (error) {
        console.error(error);

        await slackNotification({
            username: "/api/chat/teleperson/voice/transactions",
            text: JSON.stringify(error, null, 4),
        });

        return NextResponse.json({
            results: [
                {
                    toolCallId: toolCallId,
                    result: error.message,
                },
            ],
        });
    }
}
