import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderProductSchema = new Schema({
  sku: { type: String },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
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
    id: Schema.Types.ObjectId,
    sku: String
  }
}, { timestamps: true });

export default mongoose.model('OrderProduct', orderProductSchema);
