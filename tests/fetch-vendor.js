import TelepersonAPIs from "../lib/teleperson-apis.new.js";

(async () => {
    try {
        try {
            const vendor = await TelepersonAPIs.fetchVendor({
                email: "jesse@teleperson.com",
                id: 3,
            });
            // const vendor = await TelepersonAPIs.fetchVendorById(6545);
            console.log(`vendor -->`, vendor);
        } catch (error) {
            console.error(error);
        }
    } catch (error) {
        console.error(error);
    }
})();
