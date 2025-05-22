class BaseService {
    constructor() {
        // Add common service functionality here
    }

    async handleDBOperation(operation) {
        try {
            return await operation();
        } catch (error) {
            console.error('Database operation failed:', error);
            throw error;
        }
    }
}

export default BaseService; 