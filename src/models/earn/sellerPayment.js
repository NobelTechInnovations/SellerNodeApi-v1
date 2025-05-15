import mongoose from 'mongoose';

const { Schema } = mongoose;

const sellerPaymentSchema = new Schema({
  seller_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  payment_date: { type: Date, required: true },
  payout_status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  order_amount: { type: Number, default: 0 }, // Amount earned from orders
  ads_cost: { type: Number, default: 0 }, // Amount spent on ads
  referral_earnings: { type: Number, default: 0 }, // Earnings from referrals
  shipping_charges: { type: Number, default: 0 }, // Shipping charges for normal delivery
  return_shipping_charges: { type: Number, default: 0 }, // Return shipping charges deducted
  net_amount: { type: Number, default: 0 }, // Net amount after all deductions
  transaction_id: { type: String },
  orders: [{ 
    order_id: { type: Schema.Types.ObjectId, ref: 'Order' },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
    order_product_id: { type: Schema.Types.ObjectId, ref: 'OrderProduct' },
    amount: { type: Number, default: 0 },
    status: { type: String },
    delivery_date: { type: Date },
    is_return: { type: Boolean, default: false },
    return_date: { type: Date },
    return_shipping_charge: { type: Number, default: 0 }
  }],
  description: { type: String },
}, { timestamps: true });

// Create indexes for better query performance
sellerPaymentSchema.index({ seller_id: 1, payment_date: -1 });
sellerPaymentSchema.index({ 'orders.order_id': 1 });
sellerPaymentSchema.index({ payout_status: 1 });

export default mongoose.model('SellerPayment', sellerPaymentSchema); 