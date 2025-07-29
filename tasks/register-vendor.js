import TelepersonAPIs from "../lib/teleperson-apis.new.js";

(async () => {
    try {
        try {
            const data = await TelepersonAPIs.userAndVendors("jesse@teleperson.com");

            const vendors = data.data.vendors;

            console.log(`vendors -->`, vendors);
        } catch (error) {
            console.error(error);
        }
    } catch (error) {
        console.error(error);
    }
})();
