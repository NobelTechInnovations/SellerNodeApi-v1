import mongoose from 'mongoose';

const productDescriptionSchema = new mongoose.Schema({
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

export default mongoose.model('ProductDescription', productDescriptionSchema); 