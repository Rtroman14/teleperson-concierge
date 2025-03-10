import { NextResponse } from "next/server";
import { createTask } from "@/lib/createTask";

export async function GET(request) {
    try {
        const testTask = await createTask({
            queue: "test-queue",
            url: "https://webhook.site/c9346d73-4fa6-44cb-8e76-09c70741df26",
            payload: {
                message: "Hello from test task!",
                timestamp: new Date().toISOString(),
            },
            inSeconds: 5, // Execute after 5 seconds
        });

        if (!testTask) {
            throw new Error("Failed to create test task");
        }

        return NextResponse.json({
            success: true,
            data: {
                taskName: testTask.name,
                scheduledTime: testTask.scheduleTime,
            },
        });
    } catch (error) {
        console.error("Error creating test task:", error);
        return NextResponse.json(
            {
                success: false,
                message: error.message || "Failed to create task",
            },
            { status: 500 }
        );
    }
}
