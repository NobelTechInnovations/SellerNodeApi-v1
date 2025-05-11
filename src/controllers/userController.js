import User from '../models/users/user.js';
import Otps from '../models/auth/otps.js';
import SellerWarehouses from '../models/users/sellerWarehouse.js';
import SellerBankDetails from '../models/users/sellerBankDetails.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import SellerBusinessDetails from '../models/users/sellerBusinessDetails.js';

const JWT_SECRET = process.env.JWT_SECRET;

// REGISTER
export const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const user = await User.findOneAndUpdate(
      { phone }, // find by phone number
      {
        name,
        email,
        password,
        status: 'in-review',
        profile_complete: false,
      },
      { new: true } // return the updated document
    );

    return sendSuccess(res,'User registered successfully !',{
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      profile_complete: user.profile_complete,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    },201);
    
  } catch (error) {
    return sendError(res,error.message,{},400);
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, deleted_at: null }).select('+password');
    if (!user) {
      return sendError(res,'Invalid credentials',{},401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res,'Invalid credentials',{},401);
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    
    return sendSuccess(res,'Login successful !',{
        token : token,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        profile_complete: user.profile_complete,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
    },201);
  } catch (error) {
    return sendError(res,error.message,{},401);
  }
};

// OTP genrate
export const otpGenrate = async (req, res) => {
  try {
    const { phone } = req.body;
    // Helper function to generate 4-digit OTP
    const generateOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const otp = await Otps.create({
        phone,
        otp : generateOtp
    });

    return sendSuccess(res, 'OTP create successfully !', {
      otp: otp.otp,
      created_at: otp.createdAt,

    });
  } catch (error) {
    return sendError(res,error.message,{},500);
  }
};

// OTP verify
export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // 1. Find the OTP entry for the phone
    const otpRecord = await Otps.findOne({ phone, otp });
    
    if (!otpRecord) {
      return sendError(res,'Invalid OTP or phone number',{},400);
    }

    // 2. Check expiry
    if (otpRecord.expiresAt < new Date()) {
      return sendError(res,'OTP has expired !',{},400);
    }

    //Check user
    let  user = await User.findOne({ phone, deleted_at: null });
    // 3a. If user doesn't exist, create new user and return isNewUser = true
    if (!user) {
      user = new User({ phone });
      await user.save();

      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

      return sendSuccess(res, 'OTP verified, new user created', {
        token,
        isNewUser: true
      },201);
    }

    // 3. Update OTP record as verified
    otpRecord.verified = true;
    await otpRecord.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    
    // 4. Respond
    return sendSuccess(res, 'OTP verified successfully !', {

      "user" : {
        "phone" : user.phone,
        "name" : user.name ? user.name : user.phone,
      },
      "isNewUser" : false,
      "token" : token,
      
    },201);
    
  } catch (error) {
    return sendError(res,'Server error during OTP verification',error.message,400);
  }
};

//Seller Warehouse Details
export const sellerWarehouse = async (req, res) => {
  try {
    req.body.seller_id = req.user._id;
    const warehouse = await SellerWarehouses.create(req.body);
    return sendSuccess(res, 'Seller warehouse details saved successfully!', {
      warehouse,
    });
  } catch (err) {
    return sendError(res, 'Failed to save seller warehouse details', err.message, 400);
  }
};

// Create bank details
export const createBankDetails = async (req, res) => {
  try {
      req.body.seller_id = req.user._id;
      const bankDetails = await SellerBankDetails.create(req.body);
      return sendSuccess(res, 'Bank details added successfully', { bankDetails });
  } catch (err) {
      return sendError(res, 'Failed to add bank details', err.message, 400);
  }
};

// Create bank details
export const businessDetails = async (req, res) => {
  try {
      req.body.seller_id = req.user._id;
      const businessDetails = await SellerBusinessDetails.create(req.body);
      return sendSuccess(res, 'Business details added successfully', { businessDetails });
  } catch (err) {
      return sendError(res, 'Failed to add Business details', err.message, 400);
  }
};

