import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const customerBankSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    accountHolderName: { 
        type: String, 
        required: true,
        trim: true
    },
    bankName: { 
        type: String, 
        required: true,
        trim: true
    },
    accountNumber: { 
        type: String, 
        required: true,
        trim: true,
        unique: true
    },

    ifscCode: { 
        type: String, 
        required: true,
        trim: true,
        match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please provide a valid IFSC code']
    },
    accountType: { 
        type: String, 
        required: true,
        enum: ['savings', 'current'],
        default: 'savings'
    },
    accountAddress: { 
        type: String, 
        required: true,
        trim: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true 
});

// Add indexes
customerBankSchema.index({ customerId: 1 });
customerBankSchema.index({ accountNumber: 1 }, { unique: true });
customerBankSchema.index({ customerId: 1, isDefault: 1 });

const CustomerBank = customerDbConnection.model('CustomerBank', customerBankSchema);
export { CustomerBank as default, CustomerBank, customerBankSchema }; 