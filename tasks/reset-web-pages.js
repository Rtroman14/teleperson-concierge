import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// TODO: badger meter
// TODO: uw credit union
const vendorID = 9;

(async () => {
    try {
        if (vendorID === null) throw new Error("VENDOR ID IS NULL");

        // * fetch all urls where web_pages.vendor_id === vendorID && status !== Staging
        const webPages = await supabase
            .from("web_pages")
            .select("id, url, vendor_id")
            .eq("vendor_id", vendorID)
            .neq("status", "Staging");
        if (webPages.error) throw new Error(webPages.error.message);
        console.log(`There are ${webPages.data.length} web pages`);

        // * loop through each ID to reset row
        for (let webPage of webPages.data) {
            const deletedWebPage = await supabase.from("web_pages").delete().eq("id", webPage.id);
            if (deletedWebPage.error) throw new Error("Failed to delete web page:", webPage);

            const row = {
                url: webPage.url,
                vendor_id: webPage.vendor_id,
            };

            const newWebPage = await supabase.from("web_pages").insert(row);
            if (newWebPage.error) {
                throw new Error(
                    `Failed to insert ${row.url} with vendor_id ${row.vendor_id}. -->`,
                    newWebPage.error.message
                );
            }

            console.log(`Reset ${row.url}`);
        }
    } catch (error) {
        console.error("Vendor onboarding error:", error);
    }
})();
