import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

/**
 * Minimal wishlist (Phase 4, M9). Mirrors the Cart/CartItem pattern used
 * elsewhere in this service: lives on the customer database connection,
 * references the product by its cross-database `product_id` business key
 * (String, not ObjectId — Product lives in a different DB/connection), and
 * keeps a denormalized snapshot of display details so the wishlist page
 * doesn't need a cross-database join to render.
 */
const wishlistSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    productId: {
        type: String, // Product's product_id business key (cross-db reference)
        required: true
    },
    sku: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ['simple', 'variable'],
        default: 'simple'
    },
    productDetails: {
        title: String,
        image: String,
        price: Number,
        sellerName: String
    }
}, {
    timestamps: true,

    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            delete ret.__v;
            return ret;
        }
    },

    toObject: {
        virtuals: true,
        transform(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});

// One wishlist entry per customer+product; also the lookup index for the
// "is this already wishlisted" check on the PDP.
wishlistSchema.index({ customerId: 1, productId: 1 }, { unique: true });

const Wishlist = customerDbConnection.model('Wishlist', wishlistSchema);

export default Wishlist;
