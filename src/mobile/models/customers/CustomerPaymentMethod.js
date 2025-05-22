import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const customerPaymentMethodSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    methodType: {
        type: String,
        enum: ['bank', 'card', 'upi'],
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        validate: {
            validator: function(details) {
                switch (this.methodType) {
                    case 'upi':
                        return details.upiId && typeof details.upiId === 'string';
                    
                    case 'bank':
                        return details.bankName && 
                               details.accountNumber && 
                               details.ifscCode &&
                               typeof details.bankName === 'string' &&
                               typeof details.accountNumber === 'string' &&
                               typeof details.ifscCode === 'string';
                    
                    case 'card':
                        return details.cardNumber && 
                               details.cardHolderName && 
                               details.expiryDate &&
                               typeof details.cardNumber === 'string' &&
                               typeof details.cardHolderName === 'string' &&
                               typeof details.expiryDate === 'string';
                    
                    default:
                        return false;
                }
            },
            message: props => {
                switch (props.value.methodType) {
                    case 'upi':
                        return 'UPI payment method requires a valid upiId';
                    case 'bank':
                        return 'Bank payment method requires bankName, accountNumber, and ifscCode';
                    case 'card':
                        return 'Card payment method requires cardNumber, cardHolderName, and expiryDate';
                    default:
                        return 'Invalid payment method type';
                }
            }
        }
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastUsed: {
        type: Date
    }
}, {
    timestamps: true
});

// Add indexes
customerPaymentMethodSchema.index({ customerId: 1 });
customerPaymentMethodSchema.index({ customerId: 1, methodType: 1 });
customerPaymentMethodSchema.index({ customerId: 1, isDefault: 1 });

// Pre-save hook to mask sensitive data
customerPaymentMethodSchema.pre('save', function(next) {
    if (this.methodType === 'card' && this.details.cardNumber) {
        // Store only last 4 digits of card number
        this.details.maskedCardNumber = '****' + this.details.cardNumber.slice(-4);
        // Remove sensitive data
        delete this.details.cardNumber;
        delete this.details.cvv;
    }
    next();
});

const CustomerPaymentMethod = customerDbConnection.model('CustomerPaymentMethod', customerPaymentMethodSchema);
export { CustomerPaymentMethod as default, CustomerPaymentMethod, customerPaymentMethodSchema }; 