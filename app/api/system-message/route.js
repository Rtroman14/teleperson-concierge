import { Langfuse } from "langfuse";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            firstName = "",
            guidelines = [],
            pastConversations = "",
            today = "",
            numVendors = 0,
            vendorNames = "",
        } = body;

        const langfuse = new Langfuse({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            baseUrl: process.env.LANGFUSE_BASEURL,
        });

        const prompt = await langfuse.getPrompt("vendor-chatbot-voice");
        const systemMessage = prompt.compile({
            firstName,
            today,
            numVendors,
            vendorNames,
            guidelines,
            pastConversations,
        });

        return NextResponse.json({ systemMessage });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
