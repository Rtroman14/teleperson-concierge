import dotenv from "dotenv";
import _ from "../lib/Helpers.js";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
// import TelepersonAPIs from "../lib/teleperson-apis.js";

dotenv.config({ path: ".env.local" });

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const body = {
    companyName: "Clarios, LLC",
    websiteURL: "https://www.clarios.com/",
};

(async () => {
    try {
        try {
            // Fetch vendor by id from Teleperson API
            // const vendor = await TelepersonAPIs.fetchVendorById(validatedData.id);
            const vendor = body;

            // if (!vendor.success) {
            //     throw new Error(`Failed to fetch vendor from Teleperson: ${message}`);
            // }

            // Normalize the URL
            const normalizedURL = _.normalizeUrl(vendor.websiteURL);

            // Upsert vendor into Supabase
            const { data: upsertedVendor, error: vendorError } = await supabase
                .from("vendors")
                .upsert(
                    {
                        // teleperson_id: vendor.data.id,
                        name: vendor.companyName,
                        domain: vendor.websiteURL,
                        // description: vendor.data.companyOverview,
                    }
                    // {
                    //     onConflict: "teleperson_id",
                    //     // ignoreDuplicates: false,
                    // }
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
                // Fire and forget the crawl request
                axios
                    .post(`${process.env.CRAWL_AI_SCRAPER_FUNCTION}/crawl-links`, {
                        url: normalizedURL, // Using normalized URL instead of hardcoded value
                        max_depth: 0,
                        vendor_id: upsertedVendor.id, // Pass vendor ID for reference
                    })
                    .catch((error) => {
                        console.error("Failed to initiate crawl:", error);
                    });

                console.log(
                    `Initiated deep crawl for vendor ${upsertedVendor.id} at ${normalizedURL}`
                );
            }

            // Continue with remaining URLs from sitemap
            // Insert URLs in batches of 500
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

            console.log(`Processed ${urls.length} URLs for vendor ${upsertedVendor.id}`);
        } catch (error) {
            console.error("Vendor onboarding error:", error);
        }
    } catch (error) {
        console.error(error);
    }
})();
