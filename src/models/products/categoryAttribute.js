// create model schema for save category id from category table and attribute id from attribute table
import mongoose from 'mongoose';

const categoryAttributeSchema = new mongoose.Schema({
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    attribute_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attribute',
        required: true
    }
}, { timestamps: true });

export default mongoose.model('CategoryAttribute', categoryAttributeSchema);

