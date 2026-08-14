import mongoose from 'mongoose';

const { Schema } = mongoose;

const OrderSchema = new Schema({
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
      'ready_to_ship',
      'ready_to_pickup', // sent for driver
      'driver_accepted',
      'shipped',
      'out_for_delivery',
      'delivered',
      'rto_return',
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
  // Not required: customers who sign up via phone-only OTP (the primary
  // auth path in this app) legitimately have no email — Customer.email is
  // itself optional, so requiring it here always broke checkout for any
  // customer who never added one.
  customer_email: { type: String },
  // Every order placed after the multi-seller checkout split belongs to
  // exactly one seller (a cart spanning N sellers creates N separate Order
  // documents). Not `required` so pre-existing order docs stay valid.
  seller_id: { type: Schema.Types.ObjectId, ref: 'User' },
  // Shared across all sibling orders created from one checkout, so a buyer
  // can see "these were placed together" even though each order is fully
  // independent (own status, own totals, own fulfillment).
  order_group_id: { type: String, index: true },
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
  // @deprecated — only ever points at the FIRST line item of the order.
  // Kept for backward compat with existing reverse-lookups in
  // paymentController/returnController/dashboardController. Use
  // OrderProduct.find({ order_id }) instead for the full line-item list.
  orderProduct: { type: Schema.Types.ObjectId, ref: 'OrderProduct' },
  orderCustomer: { type: Schema.Types.ObjectId, ref: 'OrderCustomer' },
}, { timestamps: true });


export default mongoose.model('Order', OrderSchema);
