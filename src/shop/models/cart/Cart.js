import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const cartSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    totalItems: {
        type: Number,
        default: 0
    },
    totalQuantity: {
        type: Number,
        default: 0
    },
    subtotal: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isBuyNow: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
cartSchema.index({ customerId: 1, isActive: 1 });

// Use the customer database connection
const Cart = customerDbConnection.model('Cart', cartSchema);

export default Cart; 