import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const customerOtpSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        match: [/^\d{10}$/, 'Please provide a valid phone number']
    },
    otp: {
        type: String,
        required: true,
        match: [/^\d{6}$/, 'Invalid OTP format']
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // OTP expires after 5 minutes
    },
    attempts: {
        type: Number,
        default: 0,
        max: 3 // Maximum 3 verification attempts
    }
});

// Add indexes
customerOtpSchema.index({ phone: 1, createdAt: -1 });

const CustomerOtp = customerDbConnection.model('CustomerOtp', customerOtpSchema);
export { CustomerOtp as default, CustomerOtp, customerOtpSchema }; 