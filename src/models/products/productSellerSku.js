import mongoose from 'mongoose';

const productSellerSkuSchema = new mongoose.Schema({
    product_id: {
        type: String,
        required: true,
        ref: 'Product'
    },
    seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
});

export default mongoose.model('ProductSellerSKU', productSellerSkuSchema);