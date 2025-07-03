import TelepersonAPIs from "../lib/teleperson-apis.new.js";

(async () => {
    try {
        const user = await TelepersonAPIs.fetchUserByEmail("jesse@teleperson.com");

        console.log(`user -->`, user);
    } catch (error) {
        console.error(error);
    }
})();
