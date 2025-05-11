import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderVendorSchema = new Schema({
  orderID: { type: Schema.Types.ObjectId, required: true, ref: 'Order' },
  sellerId: { type: Schema.Types.ObjectId, required: true, ref: 'Seller' },
  order_vendor_id: { type: String, required: true, unique: true }, // Format: orderID/sellerId
}, { timestamps: true });

export default mongoose.model('OrderVendor', orderVendorSchema);
