/** @type {import('next').NextConfig} */

const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                port: "",
                hostname: "api.webagent.ai",
            },
            {
                protocol: "http",
                port: "",
                hostname: "api.webagent.ai",
            },
        ],
    },
};

export default nextConfig;
