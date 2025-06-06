import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const cartSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },

}, { timestamps: true });

const Order = customerDbConnection.model('Order', cartSchema);

export default Order;