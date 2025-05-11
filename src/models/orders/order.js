import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderSchema = new Schema({
  order_number: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: [
      'pending',
      'payment_failed',
      'on_hold',
      'payment_received',
      'confirmed',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'return_requested',
      'return_in_process',
      'returned',
      'refunded',
      'cancelled',
      'failed',
      'rejected',
      'cod_pending_verification',
      'cod_confirmed'
    ],
    default: 'pending',
  },
  customer_id: { type: Schema.Types.ObjectId, required: true, ref: 'Customer' },
  customer_email: { type: String, required: true },
  total_amount: { type: Number, default: 0 },
  total_qty: { type: Number, default: 0 },
  total_item: { type: Number, default: 0 },
  sub_total_amount: { type: Number, default: 0 },
  final_amount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  refund: { type: Number, default: 0 },
  extra: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
