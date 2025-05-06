const mongoose = require('mongoose');

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

module.exports = mongoose.model('ProductImage', productImageSchema); 