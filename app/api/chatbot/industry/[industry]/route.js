import { NextResponse } from "next/server";

import generateScript from "./generateScript";

export async function GET(request, { params }) {
    const { industry } = await params;

    try {
        const scriptContent = generateScript({ industry });

        // Create the response with the proper content type and the script content
        const response = new NextResponse(scriptContent, {
            headers: {
                "Content-Type": "application/javascript; charset=utf-8",
                "Permissions-Policy": "microphone=*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });

        return response;
    } catch (error) {
        console.error(error);
        return NextResponse.json({
            success: false,
            data: null,
            message: error.message,
        });
    }
}
