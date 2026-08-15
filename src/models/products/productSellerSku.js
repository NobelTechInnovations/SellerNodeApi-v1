import mongoose from 'mongoose';

/**
 * ProductSellerSKU — the platform's canonical product-listing identifier,
 * analogous to Amazon's ASIN.
 *
 * Every time a seller lists a product, a unique `snapzo_sku` is assigned.
 * This code:
 *  - Identifies a specific product–seller combination site-wide
 *  - Is short, URL-safe, human-readable (SNPZ-XXXXXXXX)
 *  - Can be used in filters, search, and API lookups instead of raw ObjectIds
 *  - Is indexed for fast lookup
 *
 * The model is intentionally separate from ProductCombination.sku, which
 * identifies a variation (e.g. size/color) within a variable product listing.
 */

function generateSnapzoSku() {
    // Format: SNPZ-<8 random uppercase alphanumeric chars>
    // Collision probability at 1M listings: ~0.0001% — acceptable for MVP.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `SNPZ-${code}`;
}

const productSellerSkuSchema = new mongoose.Schema({
    /**
     * Platform-assigned unique SKU for this product listing.
     * Auto-generated on first save if not provided.
     * Indexed and unique — use this like an ASIN for filtering / deep-links.
     */
    snapzo_sku: {
        type: String,
        unique: true,
        sparse: true,   // allows docs created before this field to co-exist
        index: true,
    },

    product_id: {
        type: String,
        required: true,
        ref: 'Product',
        index: true,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
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

// Composite index: one listing per seller+product
productSellerSkuSchema.index({ seller_id: 1, product_id: 1 }, { unique: true });

// Auto-generate snapzo_sku before every save if it's missing
productSellerSkuSchema.pre('save', async function (next) {
    if (this.snapzo_sku) return next();

    let sku;
    let tries = 0;
    do {
        sku = generateSnapzoSku();
        tries++;
        if (tries > 20) {
            // Extremely unlikely — bail out and let the caller retry
            return next(new Error('Failed to generate unique snapzo_sku after 20 attempts'));
        }
        // eslint-disable-next-line no-await-in-loop
    } while (await mongoose.model('ProductSellerSKU').exists({ snapzo_sku: sku }));

    this.snapzo_sku = sku;
    next();
});

export default mongoose.model('ProductSellerSKU', productSellerSkuSchema);
