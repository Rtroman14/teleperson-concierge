import dotenv from "dotenv";
import axios from "axios";
dotenv.config({ path: ".env.local" });

class TelepersonAPIs {
    constructor() {
        // this.apiKey = process.env.TELEPERSON_API_TOKEN;
        this.apiKey = process.env.TELEPERSON_API_KEY;
        this.baseUrl = "https://intapi.teleperson.com";
    }

    login = async (username) => {
        try {
            if (!username) {
                return {
                    success: false,
                    data: null,
                    message: "Username is required",
                };
            }

            const response = await axios.post(
                `${this.baseUrl}/auth/login`,
                { username } // Send username in the body
            );

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error(error.message);

            return {
                success: false,
                message: error.message,
            };
        }
    };

    fetchUserByEmail = async (email) => {
        try {
            if (!email) {
                return {
                    success: false,
                    data: null,
                    message: "Email is required",
                };
            }

            const auth = await this.login(email);
            if (!auth.success) return auth;
            const accessToken = auth.data.access_token;

            const response = await axios.get(`${this.baseUrl}/users/${email}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "x-api-key": `Bearer ${this.apiKey}`,
                },
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error(error.message);
            return {
                success: false,
                message: error.message,
            };
        }
    };

    // Get all vendors assigned to a user
    fetchVendorsByUserId = async ({ email, userId }) => {
        try {
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User ID is required",
                };
            }
            if (!email) {
                return {
                    success: false,
                    data: null,
                    message: "Username is required",
                };
            }
            const auth = await this.login(email);
            if (!auth.success) return auth;
            const accessToken = auth.data.access_token;

            const response = await axios.get(`${this.baseUrl}/vendors/user/${userId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "x-api-key": `Bearer ${this.apiKey}`,
                },
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error(error.message);
            return {
                success: false,
                message: error.message,
            };
        }
    };

    // Get all vendors assigned to a user
    vendorHub = async ({ accessToken, userId }) => {
        try {
            if (!accessToken) {
                return {
                    success: false,
                    data: null,
                    message: "Access Token is required",
                };
            }
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User ID is required",
                };
            }

            const response = await axios.get(`${this.baseUrl}/vendors/top/${userId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "x-api-key": `Bearer ${this.apiKey}`,
                },
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error(error.message);
            return {
                success: false,
                message: error.message,
            };
        }
    };

    // Get all vendors assigned to a user
    fetchTopVendors = async ({ email }) => {
        try {
            if (!email) {
                return {
                    success: false,
                    data: null,
                    message: "Username is required",
                };
            }

            const user = await this.fetchUserByEmail(email);
            if (!user.success) return user;
            const userId = user.data.id;

            const auth = await this.login(email);
            if (!auth.success) return auth;
            const accessToken = auth.data.access_token;

            const response = await axios.get(`${this.baseUrl}/vendors/top/${userId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "x-api-key": `Bearer ${this.apiKey}`,
                },
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error(error.message);
            return {
                success: false,
                message: error.message,
            };
        }
    };

    // Get a vendor by ID
    fetchVendor = async ({ email, id }) => {
        try {
            if (!id) {
                return {
                    success: false,
                    data: null,
                    message: "Vendor ID is required",
                };
            }
            if (!email) {
                return {
                    success: false,
                    data: null,
                    message: "Email is required",
                };
            }
            const auth = await this.login(email);
            if (!auth.success) {
                return auth;
            }
            const accessToken = auth.data.access_token;
            const response = await axios.get(`${this.baseUrl}/vendors/${id}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "x-api-key": `Bearer ${this.apiKey}`,
                },
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error(error.message);
            return {
                success: false,
                message: error.message,
            };
        }
    };

    // Get vendors from user's My Vendor Hub (top vendors)
    // fetchTopVendorsByUserId = async ({ username, userId }) => {
    //     try {
    //         if (!userId) {
    //             return {
    //                 success: false,
    //                 data: null,
    //                 message: "User ID is required",
    //             };
    //         }
    //         if (!username) {
    //             return {
    //                 success: false,
    //                 data: null,
    //                 message: "Username is required",
    //             };
    //         }
    //         const auth = await this.login(username);
    //         if (!auth.success) {
    //             return auth;
    //         }
    //         const accessToken = auth.data.access_token;
    //         const response = await axios.get(`${this.baseUrl}/vendors/top/${userId}`, {
    //             headers: {
    //                 "Content-Type": "application/json",
    //                 Authorization: `Bearer ${accessToken}`,
    //                 "x-api-key": `Bearer ${this.apiKey}`,
    //             },
    //         });
    //         return {
    //             success: true,
    //             data: response.data,
    //         };
    //     } catch (error) {
    //         console.error(error.message);
    //         return {
    //             success: false,
    //             message: error.message,
    //         };
    //     }
    // };

    // Get vendors from user's Vendor Lounge (removed vendors)
    fetchRemovedVendorsByUserId = async ({ username, userId }) => {
        try {
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User ID is required",
                };
            }
            if (!username) {
                return {
                    success: false,
                    data: null,
                    message: "Username is required",
                };
            }
            const auth = await this.login(username);
            if (!auth.success) {
                return auth;
            }
            const accessToken = auth.data.access_token;
            const response = await axios.get(`${this.baseUrl}/vendors/removed/${userId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "x-api-key": `Bearer ${this.apiKey}`,
                },
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error(error.message);
            return {
                success: false,
                message: error.message,
            };
        }
    };

    // Get transactions for a user
    fetchTransactions = async ({ username, userId }) => {
        try {
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User ID is required",
                };
            }
            if (!username) {
                return {
                    success: false,
                    data: null,
                    message: "Username is required",
                };
            }
            const auth = await this.login(username);
            if (!auth.success) {
                return auth;
            }
            const accessToken = auth.data.access_token;
            const response = await axios.get(`${this.baseUrl}/transactions?userId=${userId}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    "x-api-key": `Bearer ${this.apiKey}`,
                },
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error(error.message);
            return {
                success: false,
                message: error.message,
            };
        }
    };

    vendorsByEmail = async (email) => {
        try {
            if (!email) {
                return {
                    success: false,
                    data: null,
                    message: "Email is required",
                };
            }
            // Step 1: Login to get access token
            const auth = await this.login(email);
            if (!auth.success) return auth;

            // Step 2: Fetch user by email to get userId
            const user = await this.fetchUserByEmail(email);
            if (!user.success) return user;
            const userId = user.data.id;

            // Step 3: Fetch vendors by userId
            const vendors = await this.fetchVendorsByUserId({ email, userId });

            if (vendors.success) {
                return {
                    success: true,
                    data: {
                        vendors: vendors.data,
                        numVendors: vendors.data.length,
                        companyNames: vendors.data.map((vendor) => vendor.companyName),
                    },
                };
            }
            return vendors;
        } catch (error) {
            console.error(error.message);
            return {
                success: false,
                message: error.message,
            };
        }
    };

    userAndVendors = async (email) => {
        try {
            if (!email) {
                return {
                    success: false,
                    data: null,
                    message: "Email is required",
                };
            }
            // Step 1: Login to get access token
            const auth = await this.login(email);
            if (!auth.success) return auth;
            const accessToken = auth.data.access_token;

            // Step 2: Fetch user by email to get userId
            const user = await this.fetchUserByEmail(email);
            if (!user.success) return user;
            const userId = user.data.id;

            // Step 3: Fetch vendors by userId
            const vendors = await this.vendorHub({ accessToken, userId });

            if (vendors.success) {
                return {
                    success: true,
                    data: {
                        user: user.data,
                        numVendors: vendors.data.data.length,
                        vendorNames: vendors.data.data.map((vendor) => vendor.companyName),
                        vendorDetails: vendors.data.data.map((vendor) => ({
                            name: vendor.companyName,
                            description: vendor.companyOverview,
                            // websiteURL: vendor.websiteURL,
                            industry: vendor.industry,
                        })),
                    },
                };
            }
            return vendors;
        } catch (error) {
            console.error(error.message);
            return {
                success: false,
                message: error.message,
            };
        }
    };
}

export default new TelepersonAPIs();
