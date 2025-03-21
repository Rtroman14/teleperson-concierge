require("dotenv").config();

const axios = require("axios");

export default async ({ username, channel = "#webagent-errors", text }) => {
    const channels = [
        {
            text,
            username,
            icon_emoji: ":warning:",
            unfurl_links: false,
            unfurl_media: false,
            channel: "#webagent-errors",
        },
        {
            text,
            username,
            icon_emoji: ":information_source:",
            unfurl_links: false,
            unfurl_media: false,
            channel: "#feedback",
        },
        {
            text,
            username,
            icon_emoji: ":information_source:",
            unfurl_links: false,
            unfurl_media: false,
            channel: "#teleperson",
        },
    ];

    const payload = channels.find((el) => el.channel === channel);

    try {
        await axios.post(process.env.SLACK_CHANNELS, payload);
    } catch (error) {
        console.log("slackNotification() --", error);
    }
};
