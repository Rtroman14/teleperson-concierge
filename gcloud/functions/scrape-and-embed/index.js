import "dotenv/config";

import functions from "@google-cloud/functions-framework";
import { pipeline } from "@xenova/transformers";

import { createClient } from "@supabase/supabase-js";
import _ from "./src/Helpers.js";
import slackNotification from "./src/slackNotification.js";
import { scrapeInnerText } from "./src/scraping.js";
import { chunkEmbedInsert } from "./src/documentProcessing.js";
import { handleFailedScrapes } from "./src/retryHandler.js";

functions.http("scrape-and-embed", async (req, res) => {
    const { webPages, chatbotID, teamID, vendor = null, retries = 0 } = req.body;
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PRIVATE_KEY, {
        auth: { persistSession: false },
    });

    try {
        const scrapeResult = await scrapeInnerText({ webPages, vendor });

        if (!scrapeResult.success) {
            throw new Error(scrapeResult.message);
        }

        const failedScrapes = scrapeResult.data
            .filter((page) => !page.success)
            .map((page) => {
                const matchingPage = webPages.find((webPage) => webPage.url === page.url);
                const id = matchingPage ? matchingPage.id : null;
                return { id, url: page.url };
            });

        const succeededScrapes = scrapeResult.data
            .filter((page) => page.success)
            .map((page) => {
                const matchingPage = webPages.find((webPage) => webPage.url === page.url);
                const id = matchingPage ? matchingPage.id : null;
                return {
                    id,
                    url: page.url,
                    text: page.content,
                    title: page.title,
                    numCharacters: page.content.length,
                };
            });

        await handleFailedScrapes({
            failedScrapes,
            chatbotID,
            teamID,
            vendor,
            retries,
        });

        if (!succeededScrapes.length) {
            throw new Error("There were no succeeded scrapes");
        }

        const pipe = await pipeline("feature-extraction", "Supabase/gte-small");
        const chunkEmbedInsertReq = succeededScrapes.map((succeededScrape) =>
            chunkEmbedInsert({
                succeededScrape,
                pipe,
                teamID,
                supabase,
                chatbotID,
                vendor,
            })
        );

        await Promise.all(chunkEmbedInsertReq);

        return res.send({
            success: true,
            data: req.body,
        });
    } catch (error) {
        console.error(error.message);

        await slackNotification({
            username: "Scrape and Embed",
            text: error.message,
        });

        return res.send({
            success: false,
            message: error.message,
        });
    }
});
