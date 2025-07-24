import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";
import * as Sentry from "@sentry/nextjs";

export async function register() {
    // Initialize Langfuse tracing
    registerOTel({
        serviceName: "teleperson-concierge",
        traceExporter: new LangfuseExporter(),
    });

    // Initialize Sentry based on runtime
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./sentry.server.config");
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        await import("./sentry.edge.config");
    }
}

export const onRequestError = Sentry.captureRequestError;
