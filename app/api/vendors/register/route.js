import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import slackNotification from "@/lib/slackNotification";
import _ from "@/lib/Helpers";
import axios from "axios";
import TelepersonAPIs from "@/lib/teleperson-apis";

// Add auth middleware
const authenticateRequest = (request) => {
    const authToken = request.headers.get("authorization")?.split("Bearer ").at(1);
    if (!authToken || authToken !== process.env.TELEPERSON_BEARER_TOKEN) {
        return false;
    }
    return true;
};

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

        await slackNotification({
            username: "/api/teleperson/vendors/register",
            text: JSON.stringify(body, null, 4),
            channel: "#teleperson",
        });

        // Fetch vendor from Teleperson API
        const vendorResponse = await TelepersonAPIs.fetchVendorById(body.id);

        if (!vendorResponse.success) {
            throw new Error(`Failed to fetch vendor from Teleperson: ${vendorResponse.message}`);
        }

        const vendor = vendorResponse.data;

        // Normalize the URL
        const normalizedURL = _.normalizeUrl(vendor.websiteURL);

        // Upsert vendor into Supabase
        const { data: upsertedVendor, error: vendorError } = await supabase
            .from("vendors")
            .upsert(
                {
                    teleperson_id: vendor.id,
                    name: vendor.companyName,
                    domain: vendor.websiteURL,
                    description: vendor.companyOverview,
                },
                {
                    onConflict: "teleperson_id",
                }
            )
            .select()
            .single();

        if (vendorError) throw vendorError;

        // Try to fetch URLs from sitemap
        let urls = [];
        const sitemapSlugs = [
            "sitemap.xml",
            "sitemap_index.xml",
            "sitemap-index.xml",
            "sitemap.aspx",
            "sitemap.php",
            "sitemapindex.xml",
        ];

        for (const slug of sitemapSlugs) {
            const sitemapUrl = `${normalizedURL}${slug}`;
            const sitemapUrls = await _.sitemapUrlPaths(sitemapUrl);

            if (sitemapUrls.length > 0) {
                urls = sitemapUrls;
                break;
            }
        }

        // If no URLs found from sitemap, trigger crawler asynchronously
        if (urls.length === 0) {
            axios
                .post(`${process.env.CRAWL_AI_SCRAPER_FUNCTION}/crawl-links`, {
                    url: normalizedURL,
                    max_depth: 5,
                    vendor_id: upsertedVendor.id,
                })
                .catch((error) => {
                    console.error("Failed to initiate crawl:", error);
                });

            console.log(`Initiated deep crawl for vendor ${upsertedVendor.id} at ${normalizedURL}`);
        }

        // Process URLs from sitemap in batches
        const urlBatches = _.chunk(urls, 500);
        for (const batch of urlBatches) {
            const urlRecords = batch.map((url) => ({
                url: url,
                vendor_id: upsertedVendor.id,
            }));

            const { error: insertError } = await supabase.from("web_pages").upsert(urlRecords, {
                onConflict: "url",
            });

            if (insertError) {
                console.error("Error inserting URLs:", insertError);
            }
        }

        return NextResponse.json({
            success: true,
            message: "Vendor processed successfully",
            data: {
                vendor: upsertedVendor,
                urlsProcessed: urls.length,
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, data: null, message: error.message },
            { status: 500 }
        );
    }
}
