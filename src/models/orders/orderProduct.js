import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderProductSchema = new Schema({
  // The FK that was missing before — without this there was no way to
  // query "all line items for order X" at all (Order only ever linked to
  // its first item via the single `Order.orderProduct` ref).
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  sku: { type: String },
  // productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  productId: { type: String },
  product_type: { type: String },
  base_price: { type: Number, default: 0 },
  qty: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  refund: { type: Number, default: 0 },
  additional: { type: Schema.Types.Mixed, default: {} },
  sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
  product_instance: {
    name: String,
    image: String,
    order_price: Number,
    qty: Number,
    id: String,
    sku: String
    // id: Schema.Types.ObjectId,
  }
}, { timestamps: true });

export default mongoose.model('OrderProduct', orderProductSchema);
