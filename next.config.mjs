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
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals = [...(config.externals || []), "@google-cloud/tasks"];
        }
        return config;
    },
};

export default nextConfig;
