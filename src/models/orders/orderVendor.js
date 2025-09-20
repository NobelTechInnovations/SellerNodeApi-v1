import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderVendorSchema = new Schema({
  orderID: { type: Schema.Types.ObjectId, ref: 'Order' },
  sellerId: { type: Schema.Types.ObjectId, required: true, ref: 'Seller' },
  order_vendor_id: { type: String, unique: true }, // Format: orderID/sellerId
  order_vendor_uuid: String,
}, { timestamps: true });

export default mongoose.model('OrderVendor', orderVendorSchema);
