import mongoose from 'mongoose';

const attributeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Attribute name is required'],
        trim: true,
        unique: true
    },
    isRequired: {
        type: Boolean,
        default: false
    },
    type: {
        type: String,
        enum: ['meta', 'variant'],
        default: 'meta'
    },
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

const Attribute = mongoose.model('Attribute', attributeSchema);

export default Attribute; 