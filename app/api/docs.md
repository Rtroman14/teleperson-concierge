# Teleperson API Documentation

## Authentication

All endpoints require Bearer token authentication. Include the following header with all requests:

```
Authorization: Bearer
```

## Endpoints

### 1. Get Vendor Knowledge Statistics

Retrieve training statistics for a specific vendor domain.

**Endpoint:** GET /api/teleperson/vendors/knowledge/{domain}

**Parameters:**

-   domain: The vendor's domain (e.g., "example.com")

**Example Request:**

```javascript
const axios = require("axios");

const response = await axios.get(
    "https://webagent.ai/api/teleperson/vendors/knowledge/example.com",
    {
        headers: {
            Authorization: "Bearer ",
        },
    }
);
```

**Success Response:**

```json
{
    "success": true,
    "data": {
        "total_pages": 100,
        "staging_pages": 20,
        "in_progress": 30,
        "trained_pages": 45,
        "failed_pages": 5
    }
}
```

### 2. Register Vendor

Register a new vendor in the Teleperson system.

**Endpoint:** POST /api/teleperson/vendors/register

**Example Request:**

```javascript
const axios = require("axios");

const vendorData = {
    id: 4,
    companyName: "Example Corp",
    websiteURL: "example.com",
};

const response = await axios.post(
    "https://webagent.ai/api/teleperson/vendors/register",
    vendorData,
    {
        headers: {
            Authorization: "Bearer ",
            "Content-Type": "application/json",
        },
    }
);
```

**Success Response:**

```json
{
    "success": true,
    "message": "Vendor received."
}
```
