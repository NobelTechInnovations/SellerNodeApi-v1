# Agora Seller API Documentation

## Overview
The Seller API provides a comprehensive set of endpoints for managing products and categories in an e-commerce platform. This documentation describes the available endpoints and their functionality.

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