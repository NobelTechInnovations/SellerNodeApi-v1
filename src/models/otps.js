const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true
    },
    otp: {
      type: String,
      required: true
    },
    verified: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      default: () => Date.now() + 10 * 60 * 1000, // expires in 5 minutes
    }
  },
  { timestamps: true }
);

// Optional: TTL index to auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('otps', otpSchema);
