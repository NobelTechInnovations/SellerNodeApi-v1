import customerDbConnection from '../../config/database.js';

// Import models
import Order from './Order.js';

// Ensure database connection is established
customerDbConnection.on('error', console.error.bind(console, 'Customer DB connection error:'));
customerDbConnection.once('open', () => {
    console.log('Customer database connected successfully');
});

// Export all models
export {
    Order
}; 