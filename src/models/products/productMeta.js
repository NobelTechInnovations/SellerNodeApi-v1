import mongoose from 'mongoose';

const productMetaSchema = new mongoose.Schema({
    product_id: {
        type: String,
        required: true,
        ref: 'Product'
    },
    weight: {
        type: Number
    },
    stock: {
        type: Number,
        default: 0
    },
    brand_details: {
        name: String,
        manufacturer: String,
        packer: String,
        documentUrl: String
    },
    has_variations: {
        type: Boolean,
        default: false
    },
    attributes: [{
        attributeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Attribute'
        },
        name: String,
        value: String,
        optionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AttributeOption'
        }
    }]
}, {
    timestamps: true
});

// Add compound index to ensure each product has only one meta record
productMetaSchema.index({ product_id: 1 }, { unique: true });

export default mongoose.model('ProductMeta', productMetaSchema); 