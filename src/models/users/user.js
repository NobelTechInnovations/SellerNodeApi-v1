import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      // required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      // required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      match: [/^\d{10}$/, 'Phone must be 10 digits'],
      unique: true,
    },
    email_verified_at: {
      type: Date,
      default: null,
    },
    password: {
      type: String,
      // required: true,
      minlength: 6,
      select: false,
    },
    status: {
      type: String,
      enum: ['active','pending', 'inactive', 'banned'],
      default: 'pending',
    },
    profile_complete: {
      type: Boolean,
      default: false,
    },
    remember_token: {
      type: String,
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true } // includes createdAt and updatedAt
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

export default mongoose.model('User', userSchema);
