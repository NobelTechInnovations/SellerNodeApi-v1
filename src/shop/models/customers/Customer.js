import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const customerSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        match: [/^\d{10}$/, 'Please provide a valid phone number']
    },
    email: {
        type: String,
        required: false,
        match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
    },
    name: {
        type: String,
        required: false,
        minlength: [3, 'Name should be at least 3 characters']
    },
    accountLevel: {
        type: String,
        enum: ['free', 'prime'],
        default: 'free'
    },
    accountStatus: {
        type: String,
        enum: ['active', 'moderate', 'risky', 'suspended', 'good'],
        default: 'good'
    },
    addresses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerAddress'
    }],
    bankDetails: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerBank'
    }],
    paymentMethods: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CustomerPaymentMethod'
    }],
    lastLoginAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Add indexes
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ accountStatus: 1 });

const Customer = customerDbConnection.model('Customer', customerSchema);
export { Customer as default, Customer, customerSchema }; 