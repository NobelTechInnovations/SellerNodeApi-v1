import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const customerAddressSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    addressType: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
    },
    addressLine1: {
        type: String,
        required: true,
        trim: true
    },
    addressLine2: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true,
        default: 'India'
    },
    pincode: {
        type: String,
        required: true,
        match: [/^\d{6}$/, 'Please provide a valid pincode']
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    landmark: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Add indexes
customerAddressSchema.index({ customerId: 1 });
customerAddressSchema.index({ customerId: 1, isDefault: 1 });

const CustomerAddress = customerDbConnection.model('CustomerAddress', customerAddressSchema);
export { CustomerAddress as default, CustomerAddress, customerAddressSchema }; 