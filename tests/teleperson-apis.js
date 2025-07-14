import TelepersonAPIs from "../lib/teleperson-apis.new.js";

const email = "jesse@teleperson.com";

(async () => {
    try {
        // Step 2: Fetch user by email to get userId
        // const user = await TelepersonAPIs.fetchUserByEmail({
        //     email,
        // });
        // const userId = user.data.id;

        // // Step 3: Fetch all vendors for user
        // const vendors = await TelepersonAPIs.fetchVendorsByUserId({
        //     email,
        //     userId,
        // });

        const vendors = await TelepersonAPIs.vendorsByEmail(email);
        console.log(`vendors -->`, vendors.data.companyNames);
    } catch (error) {
        console.error(error);
    }
})();
