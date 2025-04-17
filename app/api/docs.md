# Teleperson API Documentation

## Authentication

All endpoints require Bearer token authentication. Include the following header with all requests:

```
Authorization: Bearer
```

### 1. Register Vendor

Register a new vendor in the system using their vendor ID.

**Endpoint:** POST /api/vendors/register

**Request Body:**

```json
{
    "id": 4 // The unique identifier of the vendor
}
```

**Example Request:**

```javascript
const axios = require("axios");

const vendorData = {
    id: 4,
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

const response = await axios.get("https://teleperson.webagent.ai/api/vendors/knowledge/{id}", {
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

## Chatbot Communication

The following functions are used to communicate with the Teleperson chatbot iframe.

### 1. Send User Email to Chat

Send the user's email to the chatbot for identification.

**Function:**

```javascript
const sendUserEmailToChat = () => {
    const chatbotIframe = document.querySelector("#teleperson-iframe");
    if (chatbotIframe) {
        chatbotIframe.contentWindow.postMessage(
            {
                type: "SET_USER_EMAIL",
                email: email,
            },
            "https://teleperson.webagent.ai"
        );
    } else {
        console.log("Chatbot iframe not found");
    }
};
```

**Usage:**

```javascript
// Call the function when you want to set the user's email
sendUserEmailToChat();
```

### 2. Handle User Logout

Notify the chatbot when a user logs out.

**Function:**

```javascript
const handleUserLogout = () => {
    const chatbotIframe = document.querySelector("#teleperson-iframe");
    if (chatbotIframe) {
        chatbotIframe.contentWindow.postMessage(
            {
                type: "USER_LOGOUT",
            },
            "https://teleperson.webagent.ai"
        );
    } else {
        console.log("Chatbot iframe not found");
    }
};
```

**Usage:**

```javascript
// Call the function when the user logs out
handleUserLogout();
```

### 3. Handle User Details Update

Update the chatbot with new user details.

**Function:**

```javascript
const handleUserDetailsUpdate = (userDetails) => {
    const chatbotIframe = document.querySelector("#teleperson-iframe");
    if (chatbotIframe) {
        chatbotIframe.contentWindow.postMessage(
            {
                type: "UPDATE_USER_DETAILS",
            },
            "https://teleperson.webagent.ai"
        );
    } else {
        console.log("Chatbot iframe not found");
    }
};
```

**Usage:**

```javascript
// Call the function with updated user details
handleUserDetailsUpdate();
```

**Note:** All these functions require the chatbot iframe to be present in the DOM with the ID `teleperson-iframe`. Make sure the iframe is properly loaded before calling these functions.
