import { Langfuse } from "langfuse";

// Initialize the Langfuse client
const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASEURL,
});

export async function POST(req) {
    try {
        const { promptName, data = {} } = await req.json();

        if (!promptName) {
            return Response.json(
                { success: false, error: "Prompt name is required" },
                { status: 400 }
            );
        }

        // Get the prompt from Langfuse
        const prompt = await langfuse.getPrompt(promptName);

        if (!prompt) {
            return Response.json(
                { success: false, error: `Prompt '${promptName}' not found` },
                { status: 404 }
            );
        }

        // Compile the prompt with current date and additional data
        const systemMessage = prompt.compile(data);

        return Response.json({
            success: true,
            data: {
                systemMessage,
            },
        });
    } catch (error) {
        console.error("Error fetching Langfuse prompt:", error);

        return Response.json(
            { success: false, error: "Failed to fetch prompt from Langfuse" },
            { status: 500 }
        );
    }
}
