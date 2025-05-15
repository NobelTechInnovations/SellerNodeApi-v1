import mongoose from 'mongoose';

const { Schema } = mongoose;

const sellerPaymentSummarySchema = new Schema({
  seller_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  total_earnings: { type: Number, default: 0 }, // Total earnings till date
  total_paid: { type: Number, default: 0 }, // Total amount paid to seller
  outstanding_amount: { type: Number, default: 0 }, // Amount to be paid
  pending_returns_amount: { type: Number, default: 0 }, // Amount that may be deducted due to pending returns
  next_payout_date: { type: Date }, // Next scheduled payout date
  next_payout_amount: { type: Number, default: 0 }, // Estimated amount for next payout
  last_payout_date: { type: Date }, // Last payout date
  last_payout_amount: { type: Number, default: 0 }, // Last payout amount
}, { timestamps: true });

// Create index for faster lookup
sellerPaymentSummarySchema.index({ seller_id: 1 });

export default mongoose.model('SellerPaymentSummary', sellerPaymentSummarySchema); 