# Teleperson API Documentation

## Authentication

All endpoints require Bearer token authentication. Include the following header with all requests:

```
Authorization: Bearer
```

### 1. Register Vendor

Register a new vendor in the system.

**Endpoint:** POST /api/vendors/register

**Request Body:**

```json
{
    "id": 4,
    "companyName": "Example Corp",
    "websiteURL": "example.com",
    "companyOverview": "Description of the company"
}
```

**Example Request:**

```javascript
const axios = require("axios");

const vendorData = {
    id: 4,
    companyName: "Example Corp",
    websiteURL: "example.com",
    companyOverview: "Description of the company",
};

const response = await axios.post(
    "https://teleperson.webagent.ai/api/vendors/register",
    vendorData,
    {
        headers: {
            Authorization: "Bearer YOUR_TOKEN",
            "Content-Type": "application/json",
        },
    }
);
```

**Success Response:**

```json
{
    "success": true,
    "message": "Vendor processed successfully",
    "data": {
        "vendor": {
            "id": "uuid",
            "teleperson_id": 4,
            "name": "Example Corp",
            "domain": "example.com",
            "description": "Description of the company"
        },
        "urlsProcessed": 100
    }
}
```

## Endpoints

### 2. Get Vendor Knowledge Statistics

Retrieve training statistics for a specific vendor.

**Endpoint:** GET /api/vendors/knowledge/{id}

**Parameters:**

-   id: The Teleperson vendor ID

**Example Request:**

```javascript
const axios = require("axios");

const response = await axios.get("https://teleperson.webagent.ai/api/vendors/knowledge/123", {
    headers: {
        Authorization: "Bearer YOUR_TOKEN",
    },
});
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
