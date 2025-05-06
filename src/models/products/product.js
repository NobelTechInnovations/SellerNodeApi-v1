const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    product_id: {
        type: String,
        unique: true
    },
    unified_sku: {
        type: String,
        unique: true
    },
    brand: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived','varification_pending','varification_failed'],
        default: 'draft'
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    slug: {
        type: String,
        trim: true,
        unique: true
    },
    type: {
        type: String,
        trim: true
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category ID is required']
    },
    condition: {
        type: String,
        enum: ['new', 'used', 'refurbished'],
        required: [true, 'Product condition is required']
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Auto-increment product_id in format AGRP{YEAR}00001
productSchema.pre('save', async function(next) {
    if (!this.product_id) {
        const currentYear = new Date().getFullYear();
        const prefix = `AGRP${currentYear}`;
        
        const lastProduct = await this.constructor.findOne(
            { product_id: new RegExp(`^${prefix}`) },
            {},
            { sort: { 'product_id': -1 } }
        );

        let sequence = 1;
        if (lastProduct) {
            const lastSequence = parseInt(lastProduct.product_id.slice(-5));
            sequence = lastSequence + 1;
        }

        this.product_id = `${prefix}${sequence.toString().padStart(5, '0')}`;
    }
    next();
});

// Auto-increment unified_sku in format PROD-{YEAR}-00001
productSchema.pre('save', async function(next) {
    if (!this.unified_sku) {
        const currentYear = new Date().getFullYear();
        const prefix = `PROD-${currentYear}-`;
        
        const lastProduct = await this.constructor.findOne(
            { unified_sku: new RegExp(`^${prefix}`) },
            {},
            { sort: { 'unified_sku': -1 } }
        );

        let sequence = 1;
        if (lastProduct) {
            const lastSequence = parseInt(lastProduct.unified_sku.split('-')[2]);
            sequence = lastSequence + 1;
        }

        this.unified_sku = `${prefix}${sequence.toString().padStart(5, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Product', productSchema); 