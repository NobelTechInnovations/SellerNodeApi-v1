import mongoose from 'mongoose';

const attributeOptionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Option name is required'],
        trim: true
    },
    value: {
        type: String,
        required: [true, 'Option value is required'],
        trim: true
    },
    attributeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attribute',
        required: [true, 'Attribute ID is required']
    }
}, {
    timestamps: true
});

// Compound index to ensure unique name-value pair for each attribute
attributeOptionSchema.index({ attributeId: 1, name: 1, value: 1 }, { unique: true });

const AttributeOption = mongoose.model('AttributeOption', attributeOptionSchema);

export default AttributeOption; 