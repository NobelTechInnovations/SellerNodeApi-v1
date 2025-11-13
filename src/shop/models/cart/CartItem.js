import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const cartItemSchema = new mongoose.Schema({
    cartId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart',
        required: true
    },
    productId: {
        type: String,  // Store product ID as string since it's from a different database
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    sku: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['simple', 'variable'],
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    basePrice: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    additional: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    saveForLater: {
        type: Boolean,
        default: false
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    // Store product details to avoid frequent cross-database queries
    productDetails: {
        name: String,
        images: [String],
        price: Number,
        sellerId: String,
        sellerName: String
    }
}, {
    timestamps: true,

    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            delete ret.__v;
            delete ret.createdAt;
            delete ret.updatedAt;
            return ret;
        }
    },

    toObject: {
        virtuals: true,
        transform(doc, ret) {
            delete ret.__v;
            delete ret.createdAt;
            delete ret.updatedAt;
            return ret;
        }
    }
});

// Indexes for faster queries
cartItemSchema.index({ cartId: 1 });
cartItemSchema.index({ productId: 1 });

// Use the customer database connection
const CartItem = customerDbConnection.model('CartItem', cartItemSchema);

export default CartItem; 