import { NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";

import slackNotification from "@/lib/slackNotification";

import _ from "@/lib/Helpers";
// import { createTask } from "@/lib/createTask";

// Add auth middleware
const authenticateRequest = (request) => {
    const authToken = request.headers.get("authorization")?.split("Bearer ").at(1);
    if (!authToken || authToken !== process.env.TELEPERSON_BEARER_TOKEN) {
        return false;
    }
    return true;
};

export async function POST(request) {
    // Add auth check
    if (!authenticateRequest(request)) {
        return NextResponse.json(
            { success: false, message: "Invalid Auth Token" },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();

        await slackNotification({
            username: "/api/teleperson/vendors/register",
            text: JSON.stringify(body, null, 4),
            channel: "#teleperson",
        });

        return NextResponse.json({
            success: true,
            message: "Vendor received.",
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, data: null, message: error.message },
            { status: 500 }
        );
    }
}
