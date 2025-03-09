import createTask from "./createTask.js";
import slackNotification from "./slackNotification.js";

const MAX_RETRIES = 5;

const handleFailedScrapes = async ({ failedScrapes, vendor, retries }) => {
    if (failedScrapes.length && retries < MAX_RETRIES) {
        console.log(
            `Retry ${failedScrapes.length} URLs (Attempt ${retries + 1} of ${MAX_RETRIES})`
        );

        await createTask({
            queue: "scrape-and-embed-queue",
            url: process.env.SCRAPE_AND_EMBED_FUNCTION,
            payload: {
                webPages: failedScrapes,
                vendor,
                retries: retries + 1,
            },
            inSeconds: 5,
        });
    } else if (failedScrapes.length) {
        console.log(`Maximum retries (${MAX_RETRIES}) reached for ${failedScrapes.length} URLs`);
        await slackNotification({
            username: "Scrape and Embed (Teleperson)",
            text: `Maximum retries reached for URLs:\n${failedScrapes
                .map((f) => f.url)
                .join("\n")}`,
        });
    }
};

export { handleFailedScrapes, MAX_RETRIES };
