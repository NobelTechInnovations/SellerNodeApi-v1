import mongoose from 'mongoose';

const productDescriptionSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
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

export default mongoose.model('ProductDescription', productDescriptionSchema); 