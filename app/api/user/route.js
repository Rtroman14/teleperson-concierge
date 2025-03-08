import { NextResponse } from "next/server";
import axios from "axios";

const TELEPERSON_API_TOKEN = process.env.TELEPERSON_API_TOKEN;

// Helper function to make GraphQL requests
const makeGraphQLRequest = async (query, variables = null) => {
    try {
        const response = await axios.post(
            "https://tapi.teleperson.com/graphql",
            { query, variables },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": TELEPERSON_API_TOKEN,
                },
            }
        );

        return response.data;
    } catch (error) {
        // Handle specific error types
        if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                throw new Error("Unauthorized: Invalid API token");
            } else if (status === 400) {
                throw new Error("Bad Request: Invalid query structure");
            }
        }
        throw new Error(`Failed to fetch data: ${error.message}`);
    }
};

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Fetch user by email
        const userQuery = `
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

        const userResult = await makeGraphQLRequest(userQuery, { email });
        const user = userResult.data.getUserDetails;

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch vendors by user ID
        const vendorsQuery = `
        query GetVendorsByUserId($userId: Int!) {
          getVendorsByUserId(userId: $userId) {
            id
            companyName
            companyOverview
            websiteURL
            industry
            createdAt
            updatedAt
          }
        }
        `;

        const vendorsResult = await makeGraphQLRequest(vendorsQuery, { userId: user.id });
        const vendors = vendorsResult.data.getVendorsByUserId || [];

        return NextResponse.json({
            user,
            vendors,
        });
    } catch (error) {
        console.error("Error fetching Teleperson user data:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch user data" },
            { status: 500 }
        );
    }
}
