const mongoose = require('mongoose');

const sellerBankDetailsSchema = new mongoose.Schema({
    seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bank_name: {
        type: String,
        required: [true, 'Bank name is required'],
        trim: true
    },
    account_number: {
        type: String,
        required: [true, 'Account number is required'],
        trim: true
    },
    account_holder_name: {
        type: String,
        required: [true, 'Account holder name is required'],
        trim: true
    },
    branch_name: {
        type: String,
        trim: true
    },
    ifsc_code: {
        type: String,
        trim: true
    },
    swift_code: {
        type: String,
        trim: true
    },
    is_primary: {
        type: Boolean,
        default: false
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SellerBankDetails', sellerBankDetailsSchema); 