const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: ".env.local" });

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    try {
        // * fetch all urls where web_pages.vendor_id === vendorID && status !== Staging
        const webPages = await supabase
            .from("web_pages")
            .select("id, url, vendor_id")
            .ilike("url", "%/de/%");
        // .eq("status", "Error");
        if (webPages.error) throw new Error(webPages.error.message);
        console.log(`There are ${webPages.data.length} web pages`);

        const pageIDs = webPages.data.map((page) => page.id);
        const batchSize = 20; // Process 20 items at a time

        // Process deletions in batches
        for (let i = 0; i < pageIDs.length; i += batchSize) {
            const batchIDs = pageIDs.slice(i, i + batchSize);
            const { error } = await supabase.from("web_pages").delete().in("id", batchIDs);

            if (error) {
                throw new Error(`Failed to delete batch ${i / batchSize + 1}: ${error.message}`);
            }

            console.log(
                `Successfully deleted batch ${i / batchSize + 1} (${batchIDs.length} pages)`
            );
        }

        console.log(`Successfully deleted all ${pageIDs.length} web pages`);
    } catch (error) {
        console.error("Deletion error:", error);
    }
})();
