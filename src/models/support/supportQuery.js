import mongoose from 'mongoose';

const supportQuerySchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    subject: {
      type: String,
      required: true
    },
    relatedConcern: {
      type: String,
      required: true
    },
    orderId: {
      type: String,
      default: null
    },
    productId: {
      type: String,
      default: null
    },
    message: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open'
    }
  },
  {
    timestamps: true
  }
);

const SupportQuery = mongoose.model('SupportQuery', supportQuerySchema);

export default SupportQuery; 