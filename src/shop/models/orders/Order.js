import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const orderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    orderItems: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'OrderItems',
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true
    },

}, { timestamps: true });

const Order = customerDbConnection.model('Order', orderSchema);

export default Order;