# Customer Authentication API Documentation

## Request OTP

Send OTP to customer's phone number for authentication.

**Endpoint:** `POST /api/mobile/customer/request-otp`

### Request Body
```json
{
    "phone": "1234567890"  // 10-digit phone number
}
```

### Success Response (200 OK)
```json
{
    "success": true,
    "message": "OTP sent successfully",
    "data": {
        "otp": "123456",    // Only in development environment
        "expiresIn": 300,   // OTP validity in seconds
        "phone": "1234567890"
    }
}
```

### Error Responses

#### Invalid Phone Number (400 Bad Request)
```json
{
    "success": false,
    "message": "Validation Error",
    "errors": [
        {
            "field": "phone",
            "message": "Please provide a valid 10-digit phone number"
        }
    ]
}
```

#### Too Many Requests (429 Too Many Requests)
```json
{
    "success": false,
    "message": "Too many OTP requests. Please try again after some time.",
    "data": {
        "retryAfter": 60  // Seconds to wait before next attempt
    }
}
```

## Verify OTP

Verify OTP and get authentication token.

**Endpoint:** `POST /api/mobile/customer/verify-otp`

### Request Body
```json
{
    "phone": "1234567890",  // 10-digit phone number
    "otp": "123456"         // 6-digit OTP
}
```

### Success Response (200 OK)
```json
{
    "success": true,
    "message": "OTP verified successfully",
    "data": {
        "token": "jwt_token_here",
        "expiresIn": 2592000,  // Token validity in seconds (30 days)
        "customer": {
            "_id": "customer_id",
            "phone": "1234567890",
            "name": "John Doe",
            "email": "john@example.com",
            "accountLevel": "free",
            "accountStatus": "good",
            "createdAt": "2024-03-21T10:00:00.000Z",
            "updatedAt": "2024-03-21T10:00:00.000Z"
        }
    }
}
```

### Error Responses

#### Invalid Input (400 Bad Request)
```json
{
    "success": false,
    "message": "Validation Error",
    "errors": [
        {
            "field": "phone",
            "message": "Please provide a valid 10-digit phone number"
        },
        {
            "field": "otp",
            "message": "Please provide a valid 6-digit OTP"
        }
    ]
}
```

#### Invalid OTP (400 Bad Request)
```json
{
    "success": false,
    "message": "Invalid OTP or OTP expired"
}
```

#### Too Many Attempts (429 Too Many Requests)
```json
{
    "success": false,
    "message": "Too many failed attempts. Please request a new OTP.",
    "data": {
        "retryAfter": 300  // Seconds to wait before next attempt
    }
}
```

## Rate Limiting

- OTP Request: Maximum 5 requests per phone number per hour
- OTP Verification: Maximum 3 attempts per OTP
- After 3 failed verification attempts, the OTP becomes invalid

## Security Measures

1. OTP expires after 5 minutes
2. Each OTP can only be used once
3. Rate limiting on both request and verification endpoints
4. Phone number validation
5. OTP format validation
6. JWT token with 30 days validity
7. Secure token transmission over HTTPS only 