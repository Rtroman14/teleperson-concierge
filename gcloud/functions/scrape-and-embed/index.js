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
    const { webPages, vendor, retries = 0 } = req.body;
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PRIVATE_KEY, {
        auth: { persistSession: false },
    });

    try {
        const webPageIDs = webPages.map((webPage) => webPage.id);

        // Fetch current web pages data and filter staging ones
        const { data: currentWebPages, error: fetchError } = await supabase
            .from("web_pages")
            .select("*")
            .in("id", webPageIDs);

        if (fetchError) throw new Error(`Failed to fetch web pages: ${fetchError.message}`);

        // Filter only staging pages
        const stagingPages = currentWebPages.filter((page) => page.status === "Staging");

        if (stagingPages.length === 0) {
            return res.send({
                success: true,
                message: "No pages in staging status found",
            });
        }

        // Update web_pages with status = "Training" and increment num_attempts
        await Promise.all(
            stagingPages.map((page) =>
                supabase
                    .from("web_pages")
                    .update({
                        status: "Training",
                        num_attempts: page.num_attempts + retries + 1,
                    })
                    .eq("id", page.id)
            )
        );

        // Continue with scraping only staging pages
        const scrapeResult = await scrapeInnerText({
            webPages: stagingPages,
            vendor,
        });

        if (!scrapeResult.success) {
            throw new Error(scrapeResult.message);
        }

        const failedScrapes = scrapeResult.data
            .filter((page) => !page.success)
            .map((page) => {
                const matchingPage = stagingPages.find((webPage) => webPage.url === page.url);
                const id = matchingPage ? matchingPage.id : null;
                return { id, url: page.url };
            });

        const succeededScrapes = scrapeResult.data
            .filter((page) => page.success)
            .map((page) => {
                const matchingPage = stagingPages.find((webPage) => webPage.url === page.url);
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
                supabase,
                vendor,
            })
        );

        await Promise.all(chunkEmbedInsertReq);

        return res.send({
            success: true,
            data: req.body,
        });
    } catch (error) {
        console.error(error);

        // Update web_pages with status = "Error" and error_message
        await Promise.all(
            webPages.map((page) =>
                supabase
                    .from("web_pages")
                    .update({
                        status: "Error",
                        error_message: error.message,
                        num_attempts: page.num_attempts + retries + 1,
                    })
                    .eq("id", page.id)
            )
        );

        await slackNotification({
            username: "Scrape and Embed (Teleperson)",
            text: error.message,
        });

        return res.send({
            success: false,
            message: error.message,
        });
    }
});
