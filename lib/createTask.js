"use server";

import { CloudTasksClient } from "@google-cloud/tasks";

// require("dotenv").config();

const googleServiceKey = process.env.GOOGLE_SERVICE_KEY;
const keys = JSON.parse(Buffer.from(googleServiceKey, "base64").toString());

// Add client configuration inline instead of relying on JSON file
const clientConfig = {
    interfaces: {
        "google.cloud.tasks.v2.CloudTasks": {
            retry_codes: {
                non_idempotent: [],
                idempotent: ["DEADLINE_EXCEEDED", "UNAVAILABLE"],
            },
            retry_params: {
                default: {
                    initial_retry_delay_millis: 100,
                    retry_delay_multiplier: 1.3,
                    max_retry_delay_millis: 60000,
                    initial_rpc_timeout_millis: 20000,
                    rpc_timeout_multiplier: 1,
                    max_rpc_timeout_millis: 20000,
                    total_timeout_millis: 600000,
                },
                "2607cc7256ff9acb2ee9b232c5722dbbaab18846": {
                    initial_retry_delay_millis: 100,
                    retry_delay_multiplier: 1.3,
                    max_retry_delay_millis: 10000,
                    initial_rpc_timeout_millis: 20000,
                    rpc_timeout_multiplier: 1,
                    max_rpc_timeout_millis: 20000,
                    total_timeout_millis: 600000,
                },
            },
            methods: {
                ListQueues: {
                    timeout_millis: 20000,
                    retry_codes_name: "idempotent",
                    retry_params_name: "2607cc7256ff9acb2ee9b232c5722dbbaab18846",
                },
                GetQueue: {
                    timeout_millis: 20000,
                    retry_codes_name: "idempotent",
                    retry_params_name: "2607cc7256ff9acb2ee9b232c5722dbbaab18846",
                },
                CreateQueue: {
                    timeout_millis: 20000,
                    retry_codes_name: "non_idempotent",
                    retry_params_name: "default",
                },
                UpdateQueue: {
                    timeout_millis: 20000,
                    retry_codes_name: "non_idempotent",
                    retry_params_name: "default",
                },
                DeleteQueue: {
                    timeout_millis: 20000,
                    retry_codes_name: "idempotent",
                    retry_params_name: "2607cc7256ff9acb2ee9b232c5722dbbaab18846",
                },
                PurgeQueue: {
                    timeout_millis: 20000,
                    retry_codes_name: "non_idempotent",
                    retry_params_name: "default",
                },
                PauseQueue: {
                    timeout_millis: 20000,
                    retry_codes_name: "non_idempotent",
                    retry_params_name: "default",
                },
                ResumeQueue: {
                    timeout_millis: 20000,
                    retry_codes_name: "non_idempotent",
                    retry_params_name: "default",
                },
                GetIamPolicy: {
                    timeout_millis: 20000,
                    retry_codes_name: "idempotent",
                    retry_params_name: "2607cc7256ff9acb2ee9b232c5722dbbaab18846",
                },
                SetIamPolicy: {
                    timeout_millis: 20000,
                    retry_codes_name: "non_idempotent",
                    retry_params_name: "default",
                },
                TestIamPermissions: {
                    timeout_millis: 20000,
                    retry_codes_name: "idempotent",
                    retry_params_name: "2607cc7256ff9acb2ee9b232c5722dbbaab18846",
                },
                ListTasks: {
                    timeout_millis: 20000,
                    retry_codes_name: "idempotent",
                    retry_params_name: "2607cc7256ff9acb2ee9b232c5722dbbaab18846",
                },
                GetTask: {
                    timeout_millis: 20000,
                    retry_codes_name: "idempotent",
                    retry_params_name: "2607cc7256ff9acb2ee9b232c5722dbbaab18846",
                },
                CreateTask: {
                    timeout_millis: 20000,
                    retry_codes_name: "non_idempotent",
                    retry_params_name: "default",
                },
                DeleteTask: {
                    timeout_millis: 20000,
                    retry_codes_name: "idempotent",
                    retry_params_name: "2607cc7256ff9acb2ee9b232c5722dbbaab18846",
                },
                RunTask: {
                    timeout_millis: 20000,
                    retry_codes_name: "non_idempotent",
                    retry_params_name: "default",
                },
            },
        },
    },
};

const client = new CloudTasksClient({
    projectId: keys.project_id,
    credentials: keys,
    clientConfig, // Add the inline configuration
});

export async function createTask({ queue, url, payload, inSeconds }) {
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
        console.error("Task creation failed:", error);
        return { success: false, error: error.message };
    }
}
