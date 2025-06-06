import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const orderVendorSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    },
}, { timestamps: true });

const OrderVendor = customerDbConnection.model('OrderVendor', orderVendorSchema);

export default OrderVendor;