import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const vendorID = 15;

(async () => {
    try {
        if (vendorID === null) throw new Error("VENDOR ID IS NULL");

        // * fetch all urls where web_pages.vendor_id === vendorID && status !== Staging
        const webPages = await supabase
            .from("web_pages")
            .select("id, url, vendor_id")
            .eq("vendor_id", vendorID)
            .eq("status", "Error");
        if (webPages.error) throw new Error(webPages.error.message);
        console.log(`There are ${webPages.data.length} web pages`);

        // * loop through each ID to reset row
        for (let webPage of webPages.data) {
            const updatedWebPage = await supabase
                .from("web_pages")
                .update({ status: "Staging" })
                .eq("id", webPage.id);

            if (updatedWebPage.error) {
                throw new Error(
                    `Failed to update ${row.url} with vendor_id ${row.vendor_id}. -->`,
                    updatedWebPage.error.message
                );
            }

            console.log(`Updated ${webPage.url}`);
        }
    } catch (error) {
        console.error("Vendor onboarding error:", error);
    }
})();
