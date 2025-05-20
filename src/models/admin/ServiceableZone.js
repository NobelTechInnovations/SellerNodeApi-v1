import mongoose from 'mongoose';

const serviceableZoneSchema = new mongoose.Schema({
    seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seller_info: {
        name: String,
        business_address: String,
        pincode: String
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    radius: {
        type: Number,
        default: 5000 // 5 km in meters
    },
    is_active: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    sent_to_mobile_app: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// Create a 2dsphere index on the location field for geospatial queries
serviceableZoneSchema.index({ location: '2dsphere' });

export default mongoose.model('ServiceableZone', serviceableZoneSchema);
