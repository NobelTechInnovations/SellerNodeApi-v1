import { body } from 'express-validator';

export const userRegister = [
    body('name')
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address'),
  
    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .isMobilePhone().withMessage('Invalid phone number'),
  
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];
  
export const userLogin = [
    body('email')
    .notEmpty().withMessage('Username is required!')
    .custom((value) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isPhone = /^\+?\d{10,15}$/.test(value); // Adjust for your region
      if (!isEmail && !isPhone) {
        throw new Error('Username must be a valid email or phone number');
      }
      return true;
    }),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const otpGenrate = [
    body('phone')
    .notEmpty().withMessage('Phone number is required!')
    .isMobilePhone('en-IN').withMessage('Please enter a valid Indian phone number')
];

export const verifyOtp = [
    body('phone')
    .notEmpty().withMessage('Phone number is required!')
    .isMobilePhone('en-IN').withMessage('Please enter a valid Indian phone number'),

    body('otp')
    .notEmpty().withMessage('OTP is required!')
    .isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits')
    .isNumeric().withMessage('OTP must be a number'),
];

export const sellerWarehouse = [
  body('warehouse_name').notEmpty().withMessage('Warehouse name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('country').notEmpty().withMessage('Country is required'),
  body('pincode')
    .notEmpty().withMessage('Pincode is required')
    .isLength({ min: 6, max: 6 }).withMessage('Pincode must be exactly 6 digits')
    .isNumeric().withMessage('Pincode must contain only numbers'),
];

export const createBankDetails = [
    body('bank_name')
        .notEmpty().withMessage('Bank name is required')
        .trim(),

    body('account_number')
        .notEmpty().withMessage('Account number is required')
        .trim()
        .isLength({ min: 9, max: 18 }).withMessage('Account number must be between 9 and 18 characters'),

    body('account_holder_name')
        .notEmpty().withMessage('Account holder name is required')
        .trim()
        .isLength({ min: 2 }).withMessage('Account holder name must be at least 2 characters'),

    body('branch_name')
        .optional()
        .trim(),

    body('ifsc_code')
        .optional()
        .trim()
        .isLength({ min: 11, max: 11 }).withMessage('IFSC code must be 11 characters'),

    body('swift_code')
        .optional()
        .trim()
        .isLength({ min: 8, max: 11 }).withMessage('SWIFT code must be between 8 and 11 characters'),

    body('is_primary')
        .optional()
        .isBoolean().withMessage('is_primary must be a boolean value')
];


