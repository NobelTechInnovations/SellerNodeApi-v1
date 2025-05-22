# Mobile App Module

This module contains all the mobile app-related code for the seller panel project. The structure is organized to keep mobile app concerns separate from the main seller panel while sharing the same database and core infrastructure.

## Directory Structure

```
mobile/
├── config/           # Mobile app specific configurations
│   └── routes.js    # Route definitions for mobile endpoints
├── controllers/      # Request handlers
│   └── baseController.js
├── services/        # Business logic
│   └── baseService.js
├── validators/      # Input validation
│   └── baseValidator.js
├── models/         # Mobile-specific models (if needed)
├── middleware/     # Mobile-specific middleware
├── utils/         # Mobile-specific utilities
├── index.js       # Main entry point
└── package.json   # Package configuration
```

## Package Usage

### Installation
Since this is a local package, you can use it in your main application by adding it to your dependencies:

```json
{
  "dependencies": {
    "@seller-panel/mobile": "file:src/mobile"
  }
}
```

### Importing Components

```javascript
// Import the entire module
const mobileModule = require('@seller-panel/mobile');

// Or import specific components
const { 
  BaseController, 
  BaseService, 
  BaseValidator, 
  mobileRoutes 
} = require('@seller-panel/mobile');
```

### Creating New Components

1. Extend the base classes for new features:

```javascript
const { BaseController } = require('@seller-panel/mobile');

class UserController extends BaseController {
  async getProfile(req, res) {
    try {
      // Your implementation
      this.sendResponse(res, data);
    } catch (error) {
      this.sendError(res, error);
    }
  }
}
```

## Best Practices

1. Keep mobile-specific code within this module
2. Reuse existing models from the main project when possible
3. Follow the established patterns for controllers, services, and validators
4. Document all new endpoints and features
5. Use the provided base classes for consistency
6. Keep the package version in sync with your main application

## Available Exports

- `BaseController`: Base class for all controllers
- `BaseService`: Base class for all services
- `BaseValidator`: Base class for input validation
- `mobileRoutes`: Express router for mobile endpoints
- `constants`: Package constants and configurations