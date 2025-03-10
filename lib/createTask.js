import { CloudTasksClient } from "@google-cloud/tasks";

const googleServiceKey = process.env.GOOGLE_SERVICE_KEY;
const keys = JSON.parse(Buffer.from(googleServiceKey, "base64").toString());

const client = new CloudTasksClient({
    projectId: keys.project_id,
    credentials: keys,
});

process.on("unhandledRejection", (err) => {
    console.error(err.message);
    process.exitCode = 1;
});

export const createTask = async ({ queue, url, payload, inSeconds }) => {
    try {
        const project = keys.project_id;
        const location = "us-central1";
        const serviceAccountEmail = keys.client_email;

        // Construct the fully qualified queue name.
        const parent = client.queuePath(project, location, queue);

        const task = {
            httpRequest: {
                headers: {
                    "Content-Type": "application/json", // Set content type to ensure compatibility your application's request parsing
                },
                httpMethod: "POST",
                url,
                oidcToken: {
                    serviceAccountEmail,
                },
                body: Buffer.from(JSON.stringify(payload)).toString("base64"),
            },
            scheduleTime: {
                seconds: inSeconds + Date.now() / 1000,
            },
        };

        // Send create task request.
        const request = { parent, task };
        const [response] = await client.createTask(request);
        const name = response.name;
        console.log(`Created task ${name}`);

        return response;
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
        return false;
    }
};
