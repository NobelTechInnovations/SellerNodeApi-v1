const mongoose = require('mongoose');

const productDescriptionSchema = new mongoose.Schema({
    product_id: {
        type: String,
        required: [true, 'Product ID is required'],
        ref: 'Product',
        refField: 'product_id',
        index: true
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    meta_details: {
        type: [String],
        default: []
    },
    language: {
        type: String,
        default: 'en',
        enum: ['en', 'fr', 'es'],
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ProductDescription', productDescriptionSchema); 