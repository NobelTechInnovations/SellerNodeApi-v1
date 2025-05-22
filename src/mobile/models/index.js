import customerDbConnection from '../config/database.js';

// Import models
import Customer from './customers/Customer.js';
import CustomerOtp from './customers/CustomerOtp.js';
import CustomerAddress from './customers/CustomerAddress.js';
import CustomerBank from './customers/CustomerBank.js';
import CustomerPaymentMethod from './customers/CustomerPaymentMethod.js';

// Ensure database connection is established
customerDbConnection.on('error', console.error.bind(console, 'Customer DB connection error:'));
customerDbConnection.once('open', () => {
    console.log('Customer database connected successfully');
});

// Export all models
export {
    Customer,
    CustomerOtp,
    CustomerAddress,
    CustomerBank,
    CustomerPaymentMethod
}; 