import { NextResponse } from "next/server";
import { createTask } from "@/lib/createTask";
import { createClient } from "@supabase/supabase-js";

const SCRAPE_BATCH_SIZE = 3; // Number of URLs to scrape in parallel
const DELAY_BETWEEN_TASKS = 60; // 60 seconds between tasks

// Time constants for scheduling logic
const DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const threeDaysAgo = new Date(Date.now() - DAYS * MS_PER_DAY).toISOString();

export async function GET(request) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY,
            { auth: { persistSession: false } }
        );

        // Fetch all pages with pagination
        let allWebPages = [];
        let page = 0;
        const PAGE_SIZE = 1000;

        while (true) {
            const { data: webPages, error } = await supabase
                .from("web_pages")
                .select("id, url, num_attempts, vendor_id(*)")
                .eq("status", "Staging")
                .lt("num_attempts", 6)
                .or(`scheduled_at.is.null,scheduled_at.lt.${threeDaysAgo}`)
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (error) {
                throw new Error(`Error fetching web pages: ${error.message}`);
            }

            if (!webPages || webPages.length === 0) {
                break; // No more results
            }

            allWebPages = [...allWebPages, ...webPages];
            page++;
        }

        // Group pages by vendor_id (using allWebPages instead of webPages)
        const pagesByVendor = allWebPages.reduce((acc, page) => {
            const vendorId = page.vendor_id.id;
            if (!acc[vendorId]) {
                acc[vendorId] = {
                    vendor: page.vendor_id,
                    pages: [],
                };
            }
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

                if (task) {
                    const updatePromises = batchPages.map((page) =>
                        supabase
                            .from("web_pages")
                            .update({ scheduled_at: new Date().toISOString() })
                            .eq("id", page.id)
                    );

                    const results = await Promise.all(updatePromises);

                    // Check for any errors in the results
                    const updateErrors = results
                        .filter((result) => result.error)
                        .map((result) => result.error);

                    if (updateErrors.length > 0) {
                        console.error("Errors updating scheduled_at:", updateErrors);
                    }
                }

                allTasks.push(task);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                tasksCreated: allTasks.length,
                totalPages: allWebPages.length,
                tasks: allTasks.map((task) => ({
                    name: task.name,
                    scheduledTime: task.scheduleTime,
                })),
            },
        });
    } catch (error) {
        console.error("Error in scrape-staging:", error);
        return NextResponse.json(
            {
                success: false,
                message: error.message || "Failed to create scraping tasks",
            },
            { status: 500 }
        );
    }
}
