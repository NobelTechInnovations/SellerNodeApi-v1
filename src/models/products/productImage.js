import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema({
    // product: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Product',
    //     required: true,
    //     index: true
    // },

    product_id: {
        type: String,
        required: true,
        ref: 'Product'
    },

    thumbnail_image: {
        type: String,
        trim: true
    },
    gallery_images: {
        type: [String],
        default: []
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

export default mongoose.model('ProductImage', productImageSchema);
