import mongoose from 'mongoose';

const productPriceSchema = new mongoose.Schema({
    product_id: {
        type: String,
        required: true,
        ref: 'Product'
    },
    mrp: {
        type: mongoose.Types.Decimal128,
        required: true,
        get: v => v ? parseFloat(v.toString()) : null
    },
    selling_price: {
        type: mongoose.Types.Decimal128,
        required: true,
        get: v => v ? parseFloat(v.toString()) : null
    },
    wdrp: {
        type: mongoose.Types.Decimal128,
        get: v => v ? parseFloat(v.toString()) : null
    }
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Add compound index to ensure each product has only one price record
productPriceSchema.index({ product_id: 1 }, { unique: true });

export default mongoose.model('ProductPrice', productPriceSchema); 