import axios from "axios";
import { XMLParser } from "fast-xml-parser";
// import Sitemapper from "sitemapper";
// import validator from "validator";

class Helpers {
    urlRe =
        /^((ftp|http|https):\/\/)?(www.)?(?!.*(ftp|http|https|www.))[a-zA-Z0-9_-]+(\.[a-zA-Z]+)+((\/)[\w#-]+)*(\/\w+\?[a-zA-Z0-9_]+=\w+(&[a-zA-Z0-9_]+=\w+)*)?\/?\*?$/gm;

    colorRe = /^([A-F0-9]{3}|[A-F0-9]{6})$/i;

    hexRe = /^#(([0-9a-fA-F]{2}){3}|([0-9a-fA-F]){3})$/i;

    isUrl = (url) => url.match(this.urlRe) !== null;

    sitemapRe =
        /^((ftp|http|https):\/\/)?(www.)?(?!.*(ftp|http|https|www.))[a-zA-Z0-9_-]+(\.[a-zA-Z]+)+((\/)[\w#-]+)*(\/\w+\?[a-zA-Z0-9_]+=\w+(&[a-zA-Z0-9_]+=\w+)*)?(\/)?.*\.xml$/gm;

    phoneRegex = new RegExp(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/);

    isSitemap = (url) => url.match(this.sitemapRe) !== null;

    fetchSitemapIndex = async (sitemapIndexXml, parser) => {
        let allUrls = [];

        let sitemaps = [];

        try {
            if (sitemapIndexXml.sitemapindex.sitemap.length) {
                sitemaps = sitemapIndexXml.sitemapindex.sitemap.map((el) => el.loc);
            } else if (typeof sitemapIndexXml.sitemapindex.sitemap === "object") {
                sitemaps = [sitemapIndexXml.sitemapindex.sitemap.loc];
            }

            for (let sitemap of sitemaps) {
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
            console.error("fetchSitemapIndex() -->", error);

            return [];
        }
    };

    sitemapUrlPaths = async (sitemapIndexUrl) => {
        let allUrls = [];

        try {
            const { data: sitemapIndex } = await axios.get(sitemapIndexUrl);

            const parser = new XMLParser();
            const sitemapIndexXml = parser.parse(sitemapIndex);

            if (sitemapIndexXml.hasOwnProperty("urlset")) {
                const urlSet = sitemapIndexXml.urlset.url
                    .map((url) => url.loc)
                    .filter(
                        (url) => !url.includes("[") && !url.includes("]") && !url.includes(".js")
                    );

                allUrls = [...allUrls, ...urlSet];
            }

            if (sitemapIndexXml.hasOwnProperty("sitemapindex")) {
                const sitemapIndexUrls = await this.fetchSitemapIndex(sitemapIndexXml, parser);

                allUrls = [...allUrls, ...sitemapIndexUrls];
            }

            return allUrls;
        } catch (error) {
            console.error("sitemapUrlPaths() -->", error.message);
            return [];
        }
    };

    // sitemapUrlPaths = async (sitemap) => {
    //     const sitemapper = new Sitemapper();

    //     try {
    //         const { sites } = await sitemapper.fetch(sitemap);
    //         return sites;
    //     } catch (error) {
    //         console.log(error);
    //         return [];
    //     }
    // };

    childrenPaths = async (parentPathAsterisk) => {
        const sitemapSlugs = [
            "sitemap.xml",
            "sitemap_index.xml",
            "sitemap-index.xml",
            "sitemap.aspx",
            "sitemap.php",
            "sitemapindex.xml",
        ];

        if (!parentPathAsterisk.includes("http")) {
            parentPathAsterisk = `https://${parentPathAsterisk}`;
        }

        const domainInfo = new URL(parentPathAsterisk);

        for (let sitemapSlug of sitemapSlugs) {
            const domainSitemap = `${domainInfo.origin}/${sitemapSlug}`; // https://supabase.com/sitemap.xml

            const parentPath = parentPathAsterisk.split("*")[0]; // https://supabase.com/docs/

            // Remove the last character in parentPath if it's a "/"
            const trimmedParentPath = parentPath.endsWith("/")
                ? parentPath.slice(0, -1)
                : parentPath;

            // * fetch all urls
            let allUrls = await this.sitemapUrlPaths(domainSitemap);

            if (allUrls.length) {
                // * filter by parentPath
                const childPaths = allUrls.filter((url) => url.includes(trimmedParentPath));

                return childPaths;
            }
        }

        return [];
    };

    wait = (second) => new Promise((res) => setTimeout(res, second * 1000));

    capitalize = (str) => `${str.charAt(0).toUpperCase()}${str.slice(1)}`;

    normalizeUrl = (url) => {
        let lowerCaseUrl = url.toLowerCase();

        // Check if it has 'http://' or 'https://' at the beginning
        if (!lowerCaseUrl.startsWith("http://") && !lowerCaseUrl.startsWith("https://")) {
            // Prepend 'http://' if it doesn't
            lowerCaseUrl = `https://${lowerCaseUrl}`;
        }

        if (
            !lowerCaseUrl.includes(".xml") &&
            !lowerCaseUrl.includes("*") &&
            !lowerCaseUrl.endsWith("/")
        ) {
            lowerCaseUrl = `${lowerCaseUrl}/`;
        }

        return lowerCaseUrl;
    };

    stripDigits = (string) => string?.replace(/\D/g, "") || "";

    removeDuplicateKey = (array, key) =>
        array.filter(
            (element, index, arr) => arr.findIndex((el) => el[key] === element[key]) === index
        );

    debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
            return () => clearTimeout(timeoutId);
        };
    };

    transformObject = (inputObj) => {
        let result = {};
        for (let key in inputObj) {
            if (inputObj.hasOwnProperty(key) && inputObj[key]) {
                result[key] = "";
            }
        }
        return result;
    };

    authenticateRequest = (request) => {
        const authToken = request.headers.get("authorization")?.split("Bearer ").at(1);
        if (!authToken || authToken !== process.env.TELEPERSON_BEARER_TOKEN) {
            return false;
        }
        return true;
    };

    chunk = (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    };
}

export default new Helpers();
