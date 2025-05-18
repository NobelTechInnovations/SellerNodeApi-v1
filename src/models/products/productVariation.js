import mongoose from 'mongoose';

const productVariationSchema = new mongoose.Schema({
    product_id: {
        type: String,
        required: true,
        ref: 'Product'
    },
    attributes: [{
        attributeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Attribute',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        values: [{
            optionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'AttributeOption',
                required: true
            },
            value: {
                type: String,
                required: true
            }
        }]
    }]
}, {
    timestamps: true
});

// Add compound index to ensure each product has only one variation record
productVariationSchema.index({ product_id: 1 }, { unique: true });

export default mongoose.model('ProductVariation', productVariationSchema); 