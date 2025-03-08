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

        const vendors = await TelepersonAPIs.fetchVendorsByUserId(teleperson_user_id);

        if (!vendors.success) {
            throw new Error("Unable to retrieve vendor information at this time.");
        }
        if (!vendors.data || vendors.data.length === 0) {
            return NextResponse.json({
                results: [
                    {
                        toolCallId: toolCallId,
                        result: "No vendors found for this user.",
                    },
                ],
            });
        }

        const vendorHub = vendors.data.map(({ id, ...rest }) => rest);

        const formattedResponse = `
The user has the following vendors (${vendorHub.length}) in their hub:
"""
${JSON.stringify(vendorHub, null, 4)}
"""`;

        return NextResponse.json({
            results: [
                {
                    toolCallId: toolCallId,
                    result: formattedResponse,
                },
            ],
        });
    } catch (error) {
        console.error(error);

        await slackNotification({
            username: "/api/chat/teleperson/voice/vendors",
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
