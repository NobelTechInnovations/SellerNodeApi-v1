const User = require('../models/user');
const Otps = require('../models/otps');
const sellerWarehouses = require('../models/sellerWarehouse');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRES_IN = '1h';


// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or phone already in use'});
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      status: 'inactive',
      profile_complete: false,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        profile_complete: user.profile_complete,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error'});
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, deleted_at: null }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        profile_complete: user.profile_complete,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// OTP genrate
exports.otpGenrate = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone, deleted_at: null });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Mobile number not found !' });
    }

    // Helper function to generate 4-digit OTP
    const generateOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const otp = await Otps.create({
        phone,
        otp : generateOtp
    });

    res.status(200).json({
      success: true,
      message: 'OTP create successfully !',
      data: {
        id: otp.otp,
        created_at: otp.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// OTP genrate
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // 1. Find the OTP entry for the phone
    const otpRecord = await Otps.findOne({ phone, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP or phone number' });
    }

    // 2. Check expiry
    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    //Check user
    const user = await User.findOne({ phone, deleted_at: null });
    if (!user) {
      return res.status(400).json({ message: 'User not found !' });
    }

    // 3. Update OTP record as verified
    otpRecord.verified = true;
    await otpRecord.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    
    // 4. Respond
    return res.status(200).json({ message: 'OTP verified successfully',"token" : token });

  } catch (error) {
    // console.error('OTP Verify Error:', error.message);
    return res.status(500).json({ message: 'Server error during OTP verification'  ,error:error.message });
  }
};


//Seller Warehouse Details
exports.sellerWarehouse = async (req, res) => {
  try {
    const warehouse = await SellerWarehouses.create(req.body);
    res.status(201).json({ success: true, data: warehouse });
  } catch (err) {
    console.error('Create Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

