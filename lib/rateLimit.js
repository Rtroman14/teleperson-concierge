import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const userIdentifier = async (headers, fallbackIdentifer) => {
    const headersList = await headers;
    const forwardedFor =
        headersList.get("x-forwarded-for") ||
        headersList.get("x-real-ip") ||
        headersList.get("cf=connecting-ip") ||
        headersList.get("client-ip");
    // const forwardedFor = headers.get("x-forwarded-for");

    if (forwardedFor) return forwardedFor;

    return headersList.get("x-real-ip") ?? fallbackIdentifer;
};

export const rateLimiting = async ({ headers, fallbackIdentifer, maxRequests, window }) => {
    const seconds = `${String(window)} s`;

    const ratelimit = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(maxRequests, seconds),
    });

    const identifier = await userIdentifier(headers, fallbackIdentifer);

    const ratelimitRes = await ratelimit.limit(identifier);

    return ratelimitRes;
};
