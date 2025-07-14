// import TelepersonAPIs from "../lib/teleperson-apis.new.js";

const email = "jesse@teleperson.com";

(async () => {
    try {
        try {
            // const user = await TelepersonAPIs.userAndVendors("jesse@teleperson.com");
            // console.log(`user -->`, user);

            const response = await fetch("http://localhost:3000/api/user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch user data");
            }

            const userData = await response.json();

            // Format user data
            const formattedUser = {
                id: userData.user.id || "",
                email: userData.user.email,
                name: `${userData.user.firstName} ${userData.user.lastName}`,
                firstName: userData.user.firstName,
                lastName: userData.user.lastName,
                vendors: userData.vendorNames,
            };

            console.log(`formattedUser -->`, formattedUser);
        } catch (error) {
            console.error(error);
        }
    } catch (error) {
        console.error(error);
    }
})();
