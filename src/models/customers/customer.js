import mongoose from 'mongoose';

const { Schema } = mongoose;

const orderCustomerSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order'}, 

  // customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },

  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },

  address: { type: String, required: true },
  pincode: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },

}, { timestamps: true });


const OrderCustomer = mongoose.model('OrderCustomer', orderCustomerSchema);

export default OrderCustomer;
