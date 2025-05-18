import mongoose from 'mongoose';

const productCombinationSchema = new mongoose.Schema({
    product_id: {
        type: String,
        required: true,
        ref: 'Product'
    },
    variant: {
        type: Map,
        of: {
            attributeId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Attribute'
            },
            optionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'AttributeOption'
            },
            value: String
        }
    },
    price: {
        type: mongoose.Types.Decimal128,
        required: true,
        get: v => v ? parseFloat(v.toString()) : null
    },
    stock: {
        type: Number,
        default: 0
    },
    imageUrl: {
        type: [String],
        default: []
    },
    sku: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Compound index to ensure unique combinations for a product
productCombinationSchema.index({ 
    product_id: 1,
    'variant': 1 
}, { 
    unique: true 
});

export default mongoose.model('ProductCombination', productCombinationSchema); 