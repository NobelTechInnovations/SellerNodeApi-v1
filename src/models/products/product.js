import mongoose from 'mongoose';
import crypto from 'crypto';

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
        enum: ['draft', 'published', 'archived','suspended','varification_failed','in-review'],
        default: 'draft'
    },
    // created_by: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User',
    //     required: true
    // },
    slug: {
        type: String,
        trim: true,
        unique: true
    },
    slug_hash: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        trim: true
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        // required: [true, 'Category ID is required']
    },
    condition: {
        type: String,
        enum: ['new', 'used', 'refurbished'],
        default: 'new'
        // required: [true, 'Product condition is required']
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add virtual fields for related data
productSchema.virtual('images', {
    ref: 'ProductImage',
    localField: 'product_id',
    foreignField: 'product_id',
    justOne: false
});

productSchema.virtual('descriptions', {
    ref: 'ProductDescription',
    localField: 'product_id',
    foreignField: 'product_id',
    justOne: false
});

productSchema.pre('save', async function (next) {
    try {
      if (!this.product_id) {
        const prefix = 'AGRP';
  
        // Generate 8-character alphanumeric string
        const generateRandomCode = () => {
          return crypto.randomBytes(6)
            .toString('base64')
            .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric
            .substring(0, 8)
            .toUpperCase();
        };
  
        let unique = false;
        let newId;
  
        while (!unique) {
          const randomPart = generateRandomCode();
          newId = `${prefix}${randomPart}`;
  
          // Ensure uniqueness
          const existing = await this.constructor.findOne({ product_id: newId });
          if (!existing) unique = true;
        }
  
        this.product_id = newId;
      }
  
      next();
    } catch (error) {
      next(error);
    }
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

export default mongoose.model('Product', productSchema); 