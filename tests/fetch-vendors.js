import TelepersonAPIs from "../lib/teleperson-apis.js";

(async () => {
    try {
        try {
            // const user = await TelepersonAPIs.fetchUserByEmail("ryan@webagent.ai");

            // console.log(`user -->`, user);

            // const vendors = await TelepersonAPIs.fetchVendorsByUserId(3);
            const vendors = await TelepersonAPIs.fetchVendorsByUserId(6545);
            // console.log(`vendors -->`, vendors);

            const vendorNames = vendors.data.map((vendor) => vendor.companyName);

            console.log(`vendorNames -->`, vendorNames);
        } catch (error) {
            console.error(error);
        }
    } catch (error) {
        console.error(error);
    }
})();
