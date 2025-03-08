import "dotenv/config";

const scrapeInnerText = async ({ webPages, vendor }) => {
    const headers = {
        "Content-Type": "application/json",
    };

    const body = {
        urls: webPages.map((page) => page.url),
    };

    // Add vendor-specific data to body if vendor exists
    if (vendor) {
        body.css_selector = vendor.target_selector;
        body.excluded_selector = vendor.remove_selectors;
    }

    try {
        const response = await fetch(`${process.env.CRAWL_AI_URL}/scrape`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Scraping error:", error);
        return {
            success: false,
            message: error.message,
        };
    }
};

export { scrapeInnerText };
