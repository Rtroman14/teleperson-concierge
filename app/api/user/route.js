import { NextResponse } from "next/server";
import telepersonApis from "@/lib/teleperson-apis.new.js";

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

        const userData = await telepersonApis.userAndVendors(email);

        if (!userData.success) {
            return NextResponse.json({ error: "User not found" }, { status: 400 });
        }

        return NextResponse.json(userData.data);
    } catch (error) {
        console.error("Error fetching Teleperson user data:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch user data" },
            { status: 500 }
        );
    }
}
