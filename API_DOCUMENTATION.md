# Agora Seller API Documentation

## Overview
The Seller API  provides a comprehensive set of endpoints for managing products and categories in an e-commerce platform. This documentation describes the available endpoints and their functionality.

## Authentication
All API endpoints require authentication using JWT (JSON Web Token). Users must include their JWT token in the Authorization header of each request.

## Base URL
The API is accessible at the base URL: http://localhost:3000/api/v1/seller

## Product Management

### Create Product
Endpoint: POST /product
This endpoint allows sellers to create new products in the system. Required fields include the product's unified SKU, category ID, and condition. Optional fields include brand, status, slug, type, images, and multilingual titles.

### Get All Products
Endpoint: GET /product
Retrieves a paginated list of products. Supports filtering by status, category, and condition. Results can be paginated using page and limit parameters.

### Get Single Product
Endpoint: GET /product/:product_id
Retrieves detailed information about a specific product using its unique product ID.

### Update Product
Endpoint: PUT /product/:product_id
Allows sellers to update existing product information. All fields are optional, and only provided fields will be updated.

### Delete Product
Endpoint: DELETE /product/:product_id
Performs a soft delete on the specified product, marking it as deleted without removing it from the database.

### Update Product Status
Endpoint: PATCH /product/:product_id/status
Updates the status of a product. Valid statuses include draft, published, archived, verification pending, and verification failed.

## Category Management

### Create Category
Endpoint: POST /product/category
Creates a new product category. Required fields include name and slug. Optional fields include thumbnail, image gallery, status, parent category, and ancestor categories.

### Get All Categories
Endpoint: GET /product/category
Retrieves a paginated list of all categories. Supports filtering by status and pagination.

### Get Single Category
Endpoint: GET /product/category/:category_id
Retrieves detailed information about a specific category.

### Get Subcategories
Endpoint: GET /product/category/:parent_id/subcategories
Retrieves all subcategories of a parent category, including nested subcategories. Supports pagination and status filtering.

### Update Category
Endpoint: PUT /product/category/:category_id
Updates an existing category's information. All fields are optional, and only provided fields will be updated.

### Delete Category
Endpoint: DELETE /product/category/:category_id
Deletes a category from the system.

## Error Handling
The API uses standard HTTP status codes to indicate the success or failure of requests. Common status codes include:
- 200: Successful request
- 201: Resource created successfully
- 400: Bad request (invalid input)
- 401: Unauthorized (invalid or missing authentication)
- 403: Forbidden (insufficient permissions)
- 404: Resource not found
- 500: Internal server error

## Field Requirements

### Product Fields
- Unified SKU: Required, minimum 3 characters, alphanumeric with hyphens/underscores
- Brand: Optional, text field
- Status: Optional, must be one of: draft, published, archived, verification pending, verification failed
- Slug: Optional, minimum 3 characters
- Type: Optional, text field
- Category ID: Required, must be a valid MongoDB ID
- Condition: Required, must be one of: new, used, refurbished

### Category Fields
- Name: Required, text field
- Slug: Required, must be unique
- Thumbnail: Optional, must be a valid URL
- Image Gallery: Optional, array of valid URLs
- Status: Optional, must be one of: active, inactive
- Parent: Optional, must be a valid category ID or null
- Ancestors: Optional, array of category IDs

## Notes
- All timestamps are in ISO 8601 format
- All IDs are MongoDB ObjectIds unless otherwise specified
- Image URLs must be publicly accessible
- Category slugs must be unique across the system
- Product SKUs must be unique across the system

## Order API

### Store Order
- **Endpoint:** `POST /api/orders`
- **Description:** Store a new order in the database.
- **Request Payload:**
  ```json
  {
    "order_number": "AGR-456-2025061012313",
    "status": "pending",
    "customer_id": "60d21b4667d0d8992e610c85",
    "customer_email": "customer@example.com",
    "total_amount": 100.00,
    "total_qty": 2,
    "total_item": 1,
    "sub_total_amount": 90.00,
    "final_amount": 100.00,
    "discount": 10.00,
    "tax": 5.00,
    "shipping": 5.00,
    "refund": 0.00,
    "extra": {},
    "order_products": [
      {
        "sku": "SKU123",
        "productId": "60d21b4667d0d8992e610c87",
        "product_type": "Electronics",
        "base_price": 50.00,
        "qty": 1,
        "total": 50.00,
        "shipping": 2.50,
        "tax": 2.50,
        "discount": 0.00,
        "refund": 0.00,
        "additional": {},
        "sellerId": "60d21b4667d0d8992e610c88",
        "product_instance": {
          "name": "Product Name",
          "image": "http://example.com/image.jpg",
          "order_price": 50.00,
          "qty": 1,
          "id": "60d21b4667d0d8992e610c87",
          "sku": "SKU123"
        }
      }
    ],
    "order_vendor": {
      "orderID": "60d21b4667d0d8992e610c86",
      "sellerId": "60d21b4667d0d8992e610c88",
      "order_vendor_id": "60d21b4667d0d8992e610c86/60d21b4667d0d8992e610c88"
    }
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "_id": "60d21b4667d0d8992e610c86",
      "order_number": "AGR-456-2025061012313",
      "status": "pending",
      "customer_id": "60d21b4667d0d8992e610c85",
      "customer_email": "customer@example.com",
      "total_amount": 100.00,
      "total_qty": 2,
      "total_item": 1,
      "sub_total_amount": 90.00,
      "final_amount": 100.00,
      "discount": 10.00,
      "tax": 5.00,
      "shipping": 5.00,
      "refund": 0.00,
      "extra": {},
      "order_products": [
        {
          "sku": "SKU123",
          "productId": "60d21b4667d0d8992e610c87",
          "product_type": "Electronics",
          "base_price": 50.00,
          "qty": 1,
          "total": 50.00,
          "shipping": 2.50,
          "tax": 2.50,
          "discount": 0.00,
          "refund": 0.00,
          "additional": {},
          "sellerId": "60d21b4667d0d8992e610c88",
          "product_instance": {
            "name": "Product Name",
            "image": "http://example.com/image.jpg",
            "order_price": 50.00,
            "qty": 1,
            "id": "60d21b4667d0d8992e610c87",
            "sku": "SKU123"
          }
        }
      ],
      "order_vendor": {
        "orderID": "60d21b4667d0d8992e610c86",
        "sellerId": "60d21b4667d0d8992e610c88",
        "order_vendor_id": "60d21b4667d0d8992e610c86/60d21b4667d0d8992e610c88"
      },
      "createdAt": "2023-06-10T12:31:30.000Z",
      "updatedAt": "2023-06-10T12:31:30.000Z"
    }
  }
  ```

## Seller Order API

### Fetch Orders by Seller ID
- **Endpoint:** `GET /api/seller/:sellerId/orders`
- **Description:** Fetch orders associated with a specific seller.
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60d21b4667d0d8992e610c86",
        "order_number": "AGR-456-2025061012313",
        "status": "pending",
        "customer_id": "60d21b4667d0d8992e610c85",
        "customer_email": "customer@example.com",
        "total_amount": 100.00,
        "total_qty": 2,
        "total_item": 1,
        "sub_total_amount": 90.00,
        "final_amount": 100.00,
        "discount": 10.00,
        "tax": 5.00,
        "shipping": 5.00,
        "refund": 0.00,
        "extra": {},
        "order_products": [
          {
            "sku": "SKU123",
            "productId": "60d21b4667d0d8992e610c87",
            "product_type": "Electronics",
            "base_price": 50.00,
            "qty": 1,
            "total": 50.00,
            "shipping": 2.50,
            "tax": 2.50,
            "discount": 0.00,
            "refund": 0.00,
            "additional": {},
            "sellerId": "60d21b4667d0d8992e610c88",
            "product_instance": {
              "name": "Product Name",
              "image": "http://example.com/image.jpg",
              "order_price": 50.00,
              "qty": 1,
              "id": "60d21b4667d0d8992e610c87",
              "sku": "SKU123"
            }
          }
        ],
        "order_vendor": {
          "orderID": "60d21b4667d0d8992e610c86",
          "sellerId": "60d21b4667d0d8992e610c88",
          "order_vendor_id": "60d21b4667d0d8992e610c86/60d21b4667d0d8992e610c88"
        },
        "createdAt": "2023-06-10T12:31:30.000Z",
        "updatedAt": "2023-06-10T12:31:30.000Z"
      }
    ]
  }
  ```

## Routes

### Order Routes
- `POST /api/orders` - Store a new order

### Seller Order Routes
- `GET /api/seller/:sellerId/orders` - Fetch orders by seller ID 

## Seller Payment API

### Get Payment Summary
- **Endpoint:** `GET /v1/seller/payment/summary`
- **Description:** Retrieves a summary of a seller's payment information including total payments to date, outstanding payments, and payment trends.
- **Authentication Required:** Yes, seller role required
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "payments_to_date": 0,
      "total_outstanding_payment": 5577.26,
      "next_payment": {
        "amount": 887,
        "date": "2023-05-15T00:00:00.000Z"
      },
      "last_payment": {
        "amount": 0,
        "date": null
      },
      "payment_trends": [
        {
          "_id": "2023-04-21",
          "total": 0
        },
        {
          "_id": "2023-04-22",
          "total": 0
        },
        // Additional data points...
      ]
    }
  }
  ```

### Get Payment Details
- **Endpoint:** `GET /v1/seller/payment/details`
- **Description:** Retrieves detailed payment information with pagination.
- **Authentication Required:** Yes, seller role required
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Number of items per page (default: 10)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "total_net_order_amount": 5577.26,
      "total_net_ads_cost": 0,
      "total_net_referral_earning": 0,
      "total_amount": 5577.26,
      "payments": [
        {
          "payment_date": "2023-05-23T00:00:00.000Z",
          "order_amount": 162,
          "ads_cost": 0,
          "referrals": 0,
          "net_amount": 162,
          "status": "pending",
          "details": "609c17a9e1b8f652734e8734"
        },
        {
          "payment_date": "2023-05-22T00:00:00.000Z",
          "order_amount": 172,
          "ads_cost": 0,
          "referrals": 0,
          "net_amount": 172,
          "status": "pending",
          "details": "609c17a9e1b8f652734e8735"
        }
        // Additional payment records...
      ],
      "pagination": {
        "total": 25,
        "page": 1,
        "limit": 10,
        "pages": 3
      }
    }
  }
  ```

### Get Single Payment Details
- **Endpoint:** `GET /v1/seller/payment/details/:paymentId`
- **Description:** Retrieves detailed information about a specific payment.
- **Authentication Required:** Yes, seller role required
- **URL Parameters:**
  - `paymentId`: ID of the payment to retrieve
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "payment_id": "609c17a9e1b8f652734e8734",
      "payment_date": "2023-05-23T00:00:00.000Z",
      "status": "pending",
      "order_amount": 162,
      "ads_cost": 0,
      "referral_earnings": 0,
      "shipping_charges": 0,
      "return_shipping_charges": 0,
      "net_amount": 162,
      "transaction_id": null,
      "orders": [
        {
          "order_id": "609c17a9e1b8f652734e8732",
          "order_number": "AGR-456-2025061012313",
          "product_name": "Smartphone X",
          "amount": 162,
          "status": "delivered",
          "delivery_date": "2023-05-22T00:00:00.000Z",
          "is_return": false,
          "return_date": null,
          "return_shipping_charge": 0
        }
        // Additional order details...
      ]
    }
  }
  ```

### Calculate Seller Payments
- **Endpoint:** `POST /v1/seller/payment/calculate`
- **Description:** Calculates and updates a seller's payment data based on delivered and returned orders.
- **Authentication Required:** Yes, seller role required
- **Response:**
  ```json
  {
    "success": true,
    "message": "Payment calculated successfully",
    "data": {
      "payment_id": "609c17a9e1b8f652734e8736",
      "net_amount": 400,
      "order_count": 4
    }
  }
  ```

### Process Seller Payment
- **Endpoint:** `POST /v1/seller/payment/process`
- **Description:** Processes a payment to a seller and marks it as completed.
- **Authentication Required:** Yes, seller role required
- **Request Body:**
  ```json
  {
    "paymentId": "609c17a9e1b8f652734e8736",
    "transactionId": "TXN12345678"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Payment processed successfully",
    "data": {
      "payment_id": "609c17a9e1b8f652734e8736",
      "status": "completed",
      "transaction_id": "TXN12345678",
      "amount": 400
    }
  }
  ``` 