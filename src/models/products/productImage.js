import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema({
    product_id: {
        type: String,
        required: [true, 'Product ID is required'],
        ref: 'Product',
        refField: 'product_id',
        index: true
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
    timestamps: true
});

export default mongoose.model('ProductImage', productImageSchema); 