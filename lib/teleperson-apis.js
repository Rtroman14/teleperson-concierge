// import dotenv from "dotenv";
import axios from "axios";
// dotenv.config({ path: ".env.local" });

class TelepersonAPIs {
    constructor() {
        this.apiKey = process.env.TELEPERSON_API_TOKEN;
        this.baseUrl = "https://tapi.teleperson.com/graphql";
    }

    // Helper method for GraphQL requests
    makeGraphQLRequest = async (query, variables = null) => {
        try {
            const response = await axios.post(
                this.baseUrl,
                { query, variables },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": this.apiKey,
                    },
                }
            );

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            let message = "Failed to fetch data";
            if (error.response) {
                const status = error.response.status;
                if (status === 401) {
                    message = "Unauthorized: Invalid API token";
                } else if (status === 400) {
                    message = "Bad Request: Invalid query structure";
                }
            }
            return {
                success: false,
                data: null,
                message: `${message}: ${error.message}`,
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

            const query = `
            query GetUserDetails($email: String!) {
              getUserDetails(email: $email) {
                id
                email
                firstName
                lastName
                status
                createdAt
                state
                gender
              }
            }
            `;

            const result = await this.makeGraphQLRequest(query, { email });
            if (!result.success) {
                return result;
            }

            return {
                success: true,
                data: result.data.data.getUserDetails,
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: `Failed to fetch user: ${error.message}`,
            };
        }
    };

    // Vendor-related methods
    fetchVendorsByUserId = async (userId) => {
        try {
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User ID is required",
                };
            }

            const query = `
            query GetVendorsByUserId($userId: Int!) {
              getVendorsByUserId(userId: $userId) {
                id
                companyName
                companyOverview
                websiteURL
                industry
              }
            }
            `;

            const result = await this.makeGraphQLRequest(query, { userId });
            if (!result.success) {
                return result;
            }

            return {
                success: true,
                data: result.data.data.getVendorsByUserId,
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: `Failed to fetch vendors: ${error.message}`,
            };
        }
    };

    // Transaction-related methods
    fetchTransactions = async (userId) => {
        try {
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User ID is required",
                };
            }

            const query = `
            query GetTransactions($input: MXUserTransctionInput!) {
              getTransactions(input: $input) {
                status
                topLevelCategory
                category
                transactedAt
                type
                amount
                description
              }
            }
            `;

            const variables = {
                input: {
                    userId: parseInt(userId),
                },
            };

            const result = await this.makeGraphQLRequest(query, variables);
            if (!result.success) {
                return result;
            }

            return {
                success: true,
                data: result.data.data.getTransactions,
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: `Failed to fetch transactions: ${error.message}`,
            };
        }
    };

    fetchVendorById = async (id) => {
        try {
            if (!id) {
                return {
                    success: false,
                    data: null,
                    message: "Vendor ID is required",
                };
            }

            const query = `
            query GetVendorById($id: Int!) {
              getVendorById(id: $id) {
                id
                companyName
                companyOverview
                websiteURL
              }
            }
            `;

            const result = await this.makeGraphQLRequest(query, { id });
            if (!result.success) {
                return result;
            }

            return {
                success: true,
                data: result.data.data.getVendorById,
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                message: `Failed to fetch vendor: ${error.message}`,
            };
        }
    };
}

export default new TelepersonAPIs();
