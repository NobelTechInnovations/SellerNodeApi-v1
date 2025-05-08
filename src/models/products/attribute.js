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
    }
}, {
    timestamps: true
});

const Attribute = mongoose.model('Attribute', attributeSchema);

export default Attribute; 