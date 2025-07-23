import TelepersonAPIs from "../lib/teleperson-apis.new.js";

// const email = "jesse@teleperson.com";
const email = "ryan@webagent.ai";

(async () => {
    try {
        try {
            const vendors = await TelepersonAPIs.fetchTopVendors({
                email,
            });

            const data = {
                user: null,
                numVendors: vendors.data.data.length,
                vendorNames: vendors.data.data.map((vendor) => vendor.companyName),
                vendorDetails: vendors.data.data.map((vendor) => ({
                    name: vendor.companyName,
                    description: vendor.companyOverview,
                    // websiteURL: vendor.websiteURL,
                    industry: vendor.industry,
                })),
            };

            const vendorsOld = await TelepersonAPIs.userAndVendors(email);
            console.log(`vendorsOld -->`, vendorsOld);

            // const vendorNames = vendors.data.map((vendor) => vendor.companyName);

            // console.log(`vendorNames -->`, vendorNames);
        } catch (error) {
            console.error(error);
        }
    } catch (error) {
        console.error(error);
    }
})();
