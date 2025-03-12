import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
// import { createTask } from "@/lib/createTask";
import { createTask } from "../lib/createTask.js";
import { join } from "path";

// Configure dotenv to use .env.local
dotenv.config({ path: join(process.cwd(), ".env.local") });

const SCRAPE_BATCH_SIZE = 2; // Number of URLs to scrape in parallel
const DELAY_BETWEEN_TASKS = 60; // 60 seconds between tasks

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { auth: { persistSession: false } }
    );

    // Fetch all staging pages with less than 6 attempts
    const { data: webPages, error } = await supabase
        .from("web_pages")
        .select("id, url, num_attempts, vendor_id(*)")
        .eq("status", "Staging")
        .lt("num_attempts", 6);

    if (error) {
        console.error("Error fetching web pages:", error);
        return;
    }

    // Group pages by vendor_id
    const pagesByVendor = webPages.reduce((acc, page) => {
        const vendorId = page.vendor_id.id;
        if (!acc[vendorId]) {
            acc[vendorId] = {
                vendor: page.vendor_id,
                pages: [],
            };
        }
        // Only include id and url in the pages array
        acc[vendorId].pages.push({
            id: page.id,
            url: page.url,
            num_attempts: page.num_attempts,
        });
        return acc;
    }, {});

    let globalTaskCount = 0;
    const allTasks = [];

    // Process each vendor's pages
    for (const [vendorId, { vendor, pages }] of Object.entries(pagesByVendor)) {
        // Create tasks for each batch of URLs
        for (let i = 0; i < pages.length; i += SCRAPE_BATCH_SIZE) {
            const batchPages = pages.slice(i, i + SCRAPE_BATCH_SIZE);
            const inSeconds = DELAY_BETWEEN_TASKS * globalTaskCount++;

            const task = await createTask({
                queue: "scrape-and-embed-queue",
                url: process.env.SCRAPE_AND_EMBED_FUNCTION,
                payload: {
                    webPages: batchPages,
                    vendor,
                },
                inSeconds,
            });

            allTasks.push(task);
        }
    }

    console.log(`Created ${allTasks.length} tasks for ${webPages.length} pages`);
    return allTasks;
}

main().catch(console.error);
