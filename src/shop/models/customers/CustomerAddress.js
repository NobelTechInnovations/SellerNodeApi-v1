import mongoose from 'mongoose';
import customerDbConnection from '../../config/database.js';

const customerAddressSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    addressType: {
        type: String,
        enum: ['home', 'work', 'other'],
        default: 'home'
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true,
        default: 'India'
    },
    pincode: {
        type: String,
        required: true,
        match: [/^\d{6}$/, 'Please provide a valid pincode']
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: false,
            validate: {
                validator: function(coordinates) {
                    // Skip validation if coordinates are not provided
                    if (!coordinates || coordinates.length === 0) return true;
                    
                    return Array.isArray(coordinates) && 
                           coordinates.length === 2 && 
                           coordinates[0] >= -180 && 
                           coordinates[0] <= 180 && 
                           coordinates[1] >= -90 && 
                           coordinates[1] <= 90;
                },
                message: 'Invalid coordinates. Must be [longitude, latitude] with valid ranges.'
            }
        }
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    landmark: {
        type: String,
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

// Add indexes
customerAddressSchema.index({ customerId: 1 });
customerAddressSchema.index({ customerId: 1, isDefault: 1 });
customerAddressSchema.index({ location: '2dsphere' }); // Add geospatial index

const CustomerAddress = customerDbConnection.model('CustomerAddress', customerAddressSchema);
export { CustomerAddress as default, CustomerAddress, customerAddressSchema }; 