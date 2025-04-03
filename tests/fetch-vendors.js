import TelepersonAPIs from "../lib/teleperson-apis.js";

(async () => {
    try {
        try {
            const vendors = await TelepersonAPIs.fetchVendorsByUserId(3);
            console.log(`vendors -->`, vendors);
        } catch (error) {
            console.error(error);
        }
    } catch (error) {
        console.error(error);
    }
})();
