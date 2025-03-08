import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import _ from "@/lib/Helpers";
import createTask from "@/lib/createTask";

// Add helper function to extract domain
const extractDomain = (urlString) => {
    try {
        const url = new URL(urlString);
        // Split hostname into parts and take the last two parts (domain.tld)
        const parts = url.hostname.split(".");
        return parts.slice(-2).join(".");
    } catch (error) {
        console.error("Invalid URL:", urlString);
        return null;
    }
};

// Add auth middleware
const authenticateRequest = (request) => {
    const authToken = request.headers.get("authorization")?.split("Bearer ").at(1);
    if (!authToken || authToken !== process.env.TELEPERSON_BEARER_TOKEN) {
        return false;
    }
    return true;
};

export async function GET(request) {
    // Add auth check
    if (!authenticateRequest(request)) {
        return NextResponse.json(
            { success: false, message: "Invalid Auth Token" },
            { status: 401 }
        );
    }

    const url = "https://www.webagent.ai/pricing";

    const domain = extractDomain(url);

    return NextResponse.json({
        success: true,
        data: {
            url,
            domain: domain,
        },
    });
}

// This api route will accept an array of URLs then will:
// 1. Check for existing URLs
// 2. If new URLs --> insert URLs then create task to scrape
// 3. If existing URLs where status === "Staging" --> create task to scrape

export async function POST(request) {
    // Add auth check
    if (!authenticateRequest(request)) {
        return NextResponse.json(
            { success: false, message: "Invalid Auth Token" },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();

        if (!body.urls || !body.company_name) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Missing required fields: urls and company_name are required",
                },
                { status: 400 }
            );
        }

        let { company_name, urls } = body;

        // Constants for batch processing
        const URL_CHUNK_SIZE = 100; // Process 500 URLs at a time
        const SCRAPE_BATCH_SIZE = 2; // Number of URLs to scrape in parallel
        const DELAY_BETWEEN_TASKS = 60; // 15 seconds between tasks

        // Deduplicate URLs
        urls = [...new Set(urls)];

        const chatbotID = "fb0b48ba-9449-4e83-bc51-43e2651e3e16";
        const teamID = "90bfc6b8-a8ed-41e7-9ba7-e18bab6725a7";

        const supabase = await createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY,
            { auth: { persistSession: false } }
        );

        // Get or create vendor
        const domain = extractDomain(urls[0]);
        const { data: vendor } = await getOrCreateVendor(supabase, domain, company_name);

        let allTasks = [];
        let globalTaskCount = 0; // Add this counter

        // Process URLs in chunks of 500
        for (let i = 0; i < urls.length; i += URL_CHUNK_SIZE) {
            const urlChunk = urls.slice(i, i + URL_CHUNK_SIZE);

            // Get existing pages for this chunk
            const { data: existingPages, error: existingPagesError } = await supabase
                .from("teleperson_web_pages")
                .select("id, url, status")
                .eq("vendor_id", vendor.id)
                .neq("status", "Trained")
                .in("url", urlChunk);
            if (existingPagesError) throw new Error(existingPagesError.message);

            // Filter out existing URLs
            const existingUrls = existingPages?.map((p) => p.url) || [];
            const newUrls = urlChunk.filter((url) => !existingUrls.includes(url));
            const stagingUrls = existingPages.filter((page) => page.status === "Staging");

            let webPages = [];

            if (newUrls.length) {
                // Insert new URLs in batch
                const webPagesForInsert = newUrls.map((url) => ({
                    url,
                    status: "Training",
                    vendor_id: vendor.id,
                }));
                if (webPagesForInsert.length === 0) continue;

                const { data: insertedWebPages, error: insertedWebPagesError } = await supabase
                    .from("teleperson_web_pages")
                    .insert(webPagesForInsert)
                    .select("id, url");

                if (insertedWebPagesError) {
                    console.error(insertedWebPagesError);
                } else {
                    webPages = [...webPages, ...insertedWebPages];
                }
            }

            if (stagingUrls.length) {
                const stagingPages = stagingUrls.map((row) => ({ id: row.id, url: row.url }));
                webPages = [...webPages, ...stagingPages];
            }

            // Pass the globalTaskCount reference
            const tasks = await createScrapingTasks(webPages, {
                SCRAPE_BATCH_SIZE,
                DELAY_BETWEEN_TASKS,
                chatbotID,
                teamID,
                vendor,
                globalTaskCount, // Pass the counter
            });

            // Update the global counter based on number of tasks created
            globalTaskCount += Math.ceil(webPages.length / SCRAPE_BATCH_SIZE);
            allTasks.push(...tasks);
        }

        return NextResponse.json({
            success: true,
            data: allTasks,
            message: "Tasks created successfully",
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, data: null, message: error.message },
            { status: 500 }
        );
    }
}

// Helper function to get or create vendor
async function getOrCreateVendor(supabase, domain, company_name) {
    const { data: existingVendor, error: fetchError } = await supabase
        .from("vendors")
        .select()
        .eq("domain", domain)
        .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);

    if (existingVendor) return { data: existingVendor };

    const { data: newVendor, error: vendorError } = await supabase
        .from("vendors")
        .insert({ name: company_name, domain })
        .select()
        .single();

    if (vendorError) throw new Error(vendorError.message);
    return { data: newVendor };
}

// Helper function to create scraping tasks
async function createScrapingTasks(webPages, config) {
    const { SCRAPE_BATCH_SIZE, DELAY_BETWEEN_TASKS, chatbotID, teamID, vendor, globalTaskCount } =
        config;
    const tasks = [];
    let localTaskCount = 0;

    for (let i = 0; i < webPages.length; i += SCRAPE_BATCH_SIZE) {
        const batchUrls = webPages.slice(i, i + SCRAPE_BATCH_SIZE);

        const inSeconds = DELAY_BETWEEN_TASKS * (globalTaskCount + localTaskCount++);

        console.log(`inSeconds -->`, inSeconds);

        const task = await createTask({
            queue: "scrape-and-embed-queue",
            url: process.env.SCRAPE_AND_EMBED_FUNCTION,
            payload: {
                webPages: batchUrls,
                chatbotID,
                teamID,
                vendor,
            },
            inSeconds,
        });

        tasks.push(task);
    }

    return tasks;
}
