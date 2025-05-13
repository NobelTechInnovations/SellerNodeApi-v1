import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
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
