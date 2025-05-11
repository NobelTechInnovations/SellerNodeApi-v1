const mongoose = require('mongoose');

const sellerBusinessDetailsSchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  business_name: { type: String, required: true },
  business_address: { type: String },
  pincode: { type: String },
  business_identity_number: { type: String },
  business_identity_type: { type: String },
  currency: { type: String },
  language: { type: String },
  documents: { type: mongoose.Schema.Types.Mixed }, // Accepts any JSON-like object
  status: { type: String, default: 'in-review' }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // auto-manage timestamps
});

module.exports = mongoose.model('SellerBusinessDetails', sellerBusinessDetailsSchema);
