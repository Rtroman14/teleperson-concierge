import dotenv from "dotenv";
import axios from "axios";
dotenv.config({ path: ".env.local" });

class TelepersonAPIs {
    constructor() {
        this.apiKey = process.env.TELEPERSON_API_TOKEN;
        this.baseUrl = "https://intapi.teleperson.com";
    }

    fetchUserByEmail = async (email) => {
        try {
            if (!email) {
                return {
                    success: false,
                    data: null,
                    message: "Email is required",
                };
            }

            const response = await axios.get(`${this.baseUrl}/users/${email}`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
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
    fetchVendorsByUserId = async (userId) => {
        try {
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User ID is required",
                };
            }

            const response = await axios.get(`${this.baseUrl}/vendors/user/${userId}`, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.apiKey,
                },
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            let message = "Failed to fetch vendors";
            if (error.response) {
                const status = error.response.status;
                if (status === 401) {
                    message = "Unauthorized: Invalid API token";
                } else if (status === 400) {
                    message = "Bad Request: Invalid request";
                } else if (status === 404) {
                    message = "Not Found: Vendors not found";
                }
            }
            return {
                success: false,
                data: null,
                message: `${message}: ${error.message}`,
            };
        }
    };

    // Get a vendor by ID
    fetchVendorById = async (id) => {
        try {
            if (!id) {
                return {
                    success: false,
                    data: null,
                    message: "Vendor ID is required",
                };
            }

            const response = await axios.get(`${this.baseUrl}/vendors/${id}`, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.apiKey,
                },
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            let message = "Failed to fetch vendor";
            if (error.response) {
                const status = error.response.status;
                if (status === 401) {
                    message = "Unauthorized: Invalid API token";
                } else if (status === 400) {
                    message = "Bad Request: Invalid request";
                } else if (status === 404) {
                    message = "Not Found: Vendor not found";
                }
            }
            return {
                success: false,
                data: null,
                message: `${message}: ${error.message}`,
            };
        }
    };

    // Get vendors from user's My Vendor Hub (top vendors)
    fetchTopVendorsByUserId = async (userId) => {
        try {
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
                    "x-api-key": this.apiKey,
                },
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            let message = "Failed to fetch top vendors";
            if (error.response) {
                const status = error.response.status;
                if (status === 401) {
                    message = "Unauthorized: Invalid API token";
                } else if (status === 400) {
                    message = "Bad Request: Invalid request";
                } else if (status === 404) {
                    message = "Not Found: Top vendors not found";
                }
            }
            return {
                success: false,
                data: null,
                message: `${message}: ${error.message}`,
            };
        }
    };

    // Get vendors from user's Vendor Lounge (removed vendors)
    fetchRemovedVendorsByUserId = async (userId) => {
        try {
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User ID is required",
                };
            }

            const response = await axios.get(`${this.baseUrl}/vendors/removed/${userId}`, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.apiKey,
                },
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            let message = "Failed to fetch removed vendors";
            if (error.response) {
                const status = error.response.status;
                if (status === 401) {
                    message = "Unauthorized: Invalid API token";
                } else if (status === 400) {
                    message = "Bad Request: Invalid request";
                } else if (status === 404) {
                    message = "Not Found: Removed vendors not found";
                }
            }
            return {
                success: false,
                data: null,
                message: `${message}: ${error.message}`,
            };
        }
    };

    // Get transactions for a user
    fetchTransactions = async (userId) => {
        try {
            if (!userId) {
                return {
                    success: false,
                    data: null,
                    message: "User ID is required",
                };
            }

            const response = await axios.get(`${this.baseUrl}/transactions?userId=${userId}`, {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.apiKey,
                },
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            let message = "Failed to fetch transactions";
            if (error.response) {
                const status = error.response.status;
                if (status === 401) {
                    message = "Unauthorized: Invalid API token";
                } else if (status === 400) {
                    message = "Bad Request: Invalid request";
                } else if (status === 404) {
                    message = "Not Found: Transactions not found";
                }
            }
            return {
                success: false,
                data: null,
                message: `${message}: ${error.message}`,
            };
        }
    };
}

export default new TelepersonAPIs();
