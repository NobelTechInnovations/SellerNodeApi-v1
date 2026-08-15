import mongoose from 'mongoose';

// Phase 4 (M5): a seller-set ranking-weight input for a product against a
// search keyword. Deliberately NOT a real payment/billing record — bid_amount
// is a relative signal used to nudge ranking, capped so it can never
// dominate relevance (see biddingService.applyBidBoost). No charge is ever
// made against this in the current system.
const productBidSchema = new mongoose.Schema({
    seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product_id: { type: String, required: true, ref: 'Product' }, // Product.product_id business key
    keyword: { type: String, required: true, trim: true, lowercase: true },
    bid_amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['active', 'paused'], default: 'active', index: true },
}, { timestamps: true });

// A seller shouldn't have two separate bids for the same product+keyword —
// upsert against this instead of creating duplicates.
productBidSchema.index({ seller_id: 1, product_id: 1, keyword: 1 }, { unique: true });
// The hot query path: "active bids for this keyword" (ranking boost lookup).
productBidSchema.index({ keyword: 1, status: 1 });

export default mongoose.model('ProductBid', productBidSchema);
