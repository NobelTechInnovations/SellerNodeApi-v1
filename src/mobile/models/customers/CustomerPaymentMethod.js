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
    methodDetails: {
        // For UPI
        upiId: String,
        // For Card
        cardType: {
            type: String,
            enum: ['credit', 'debit']
        },
        cardNetwork: {
            type: String,
            enum: ['visa', 'mastercard', 'rupay']
        },
        cardLastFour: String,
        cardExpiryMonth: Number,
        cardExpiryYear: Number,
        // For Netbanking
        bankName: String,
        accountLastFour: String
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

const CustomerPaymentMethod = customerDbConnection.model('CustomerPaymentMethod', customerPaymentMethodSchema);
export { CustomerPaymentMethod as default, CustomerPaymentMethod, customerPaymentMethodSchema }; 