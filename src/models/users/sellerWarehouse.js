const mongoose = require('mongoose');

const sellerWarehouseSchema = new mongoose.Schema({
  seller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to User collection
      required: true
  },
  warehouse_name: {
    type: String,
    required: true,
    trim: true
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
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    trim: true
  },
  contact_name: {
    type: String,
    default: null,
    trim: true
  },
  contact_phone: {
    type: String,
    default: null,
    trim: true
  },
  is_default: {
    type: Boolean,
    default: false
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('SellerWarehouse', sellerWarehouseSchema);
