// create schema foor driver order to save order_nnumber and driver details

import mongoose from 'mongoose';

const driverOrderSchema = new mongoose.Schema({
    order_number: { type: String, required: true },
    driver_details: { type: Object, required: true },
    status: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('DriverOrder', driverOrderSchema);