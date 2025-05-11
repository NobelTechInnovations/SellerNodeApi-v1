// create a model for seller business details

import { json } from 'express';
import mongoose from 'mongoose';

const sellerBusinessDetailsSchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  business_name: { type: String, required: true },
  business_address: { type: String },
  pincode: { type: String },
  business_identity_number: { type: String },
  business_identity_type: { type: String },
  currency: { type: String },
  language: { type: String },
  documents: { type: json },
  status: { type: String, default: 'in-review' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const SellerBusinessDetails = mongoose.model('SellerBusinessDetails', sellerBusinessDetailsSchema);

export default SellerBusinessDetails;