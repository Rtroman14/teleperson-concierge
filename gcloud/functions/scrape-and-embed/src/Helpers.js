import axios from "axios";
import { XMLParser } from "fast-xml-parser";

class Helpers {
    fetchAllUrlPaths = async (sitemapIndexUrl) => {
        let allUrls = [];

        try {
            const { data: sitemapIndex } = await axios.get(sitemapIndexUrl);

            const parser = new XMLParser();
            const sitemapIndexXml = parser.parse(sitemapIndex);

            const sitemaps = sitemapIndexXml.sitemapindex.sitemap.map((el) => el.loc);

            for (let sitemap of sitemaps) {
                // console.log("sitemap -->", sitemap);
                const { data: sitemapRes } = await axios.get(sitemap);

                const sitemapXml = parser.parse(sitemapRes);

                if (sitemapXml.urlset !== "") {
                    if ("url" in sitemapXml.urlset) {
                        if (sitemapXml.urlset.url.length) {
                            const urls = sitemapXml.urlset.url.map((el) => el.loc);
                            allUrls = [...allUrls, ...urls];
                        } else {
                            allUrls.push(sitemapXml.urlset.url.loc);
                        }
                    }
                }
            }

            return allUrls;
        } catch (error) {
            console.error("fetchAllUrls() -->", error.message);
            return [];
        }
    };

    childrenPaths = async (parentPathAsterisk) => {
        if (!parentPathAsterisk.includes("http")) {
            parentPathAsterisk = `https://${parentPathAsterisk}`;
        }

        const domainInfo = new URL(parentPathAsterisk);

        const domainSitemap = `${domainInfo.origin}/sitemap.xml`; // https://supabase.com/sitemap.xml

        const parentPath = parentPathAsterisk.split("*")[0]; // https://supabase.com/docs/

        // * fetch all urls
        const allUrls = await this.fetchAllUrlPaths(domainSitemap);

        // * filter by parentPath
        const childPaths = allUrls.filter((url) => url.includes(parentPath));

        return childPaths;
    };

    chunk = (array, size) => {
        const chunked = [];
        let index = 0;

        while (index < array.length) {
            chunked.push(array.slice(index, index + size));
            index += size;
        }

        return chunked;
    };

    wait = (second) => new Promise((res) => setTimeout(res, second * 1000));
}

export default new Helpers();
