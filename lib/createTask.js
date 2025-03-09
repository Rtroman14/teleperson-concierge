import { CloudTasksClient } from "@google-cloud/tasks";

const createTask = async ({ queue, url, payload, inSeconds }) => {
    try {
        // Only create client if we have the necessary environment variables
        if (!process.env.GOOGLE_SERVICE_KEY) {
            throw new Error("Google service key not configured");
        }

        const keys = JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_KEY, "base64").toString());

        const client = new CloudTasksClient({
            credentials: {
                client_id: keys.client_id,
                client_email: keys.client_email,
                project_id: keys.project_id,
                private_key: keys.private_key,
            },
            // Add fallback configuration inline
            clientConfig: {
                apiEndpoint: "cloudtasks.googleapis.com",
                port: 443,
                servicePath: "",
                scopes: ["https://www.googleapis.com/auth/cloud-platform"],
            },
        });

        const project = keys.project_id;
        const location = "us-central1";

        // Construct the fully qualified queue name.
        const parent = client.queuePath(project, location, queue);

        const task = {
            httpRequest: {
                headers: {
                    "Content-Type": "application/json",
                },
                httpMethod: "POST",
                url,
                oidcToken: {
                    serviceAccountEmail: keys.client_email,
                },
                body: Buffer.from(JSON.stringify(payload)).toString("base64"),
            },
            scheduleTime: {
                seconds: inSeconds + Date.now() / 1000,
            },
        };

        const request = { parent, task };
        const [response] = await client.createTask(request);

        return response;
    } catch (error) {
        console.error("Error creating task:", error);
        return false;
    }
};

export default createTask;
