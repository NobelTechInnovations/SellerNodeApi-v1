import mongoose from 'mongoose';

const productSellerSkuSchema = new mongoose.Schema({
    // product: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Product',
    //     required: true
    // },

    product_id: {
        type: String,
        required: true,
        ref: 'Product'
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,

    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            delete ret.__v;
            delete ret.createdAt;
            delete ret.updatedAt;
            return ret;
        }
    },

    toObject: {
        virtuals: true,
        transform(doc, ret) {
            delete ret.__v;
            delete ret.createdAt;
            delete ret.updatedAt;
            return ret;
        }
    }
});

export default mongoose.model('ProductSellerSKU', productSellerSkuSchema);