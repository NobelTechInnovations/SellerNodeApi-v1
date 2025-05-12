import express from 'express';
import * as registerValidator from '../../../../src/validators/user.js';
import { validate } from '../../../../src/middleware/validate.js';
import * as userController from '../../../../src/controllers/userController.js';
import auth from '../../../../src/middleware/auth.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

//User Registration 
router.post('/register', registerValidator.userRegister, validate, userController.register);
router.post('/login', registerValidator.userLogin, validate, userController.login);
router.post('/request-otp', registerValidator.otpGenrate, validate, userController.otpGenrate);
router.post('/verify-otp', registerValidator.verifyOtp, validate, userController.verifyOtp);
router.post('/add-warehouse', auth, registerValidator.sellerWarehouse, validate, userController.sellerWarehouse);
router.post('/add-bank-details', auth, userController.sellerBankDetails);
router.post('/business-data', 
  auth, 
  upload.fields([
    { name: 'gst_certificate', maxCount: 1 },
    { name: 'pan_card', maxCount: 1 },
    { name: 'business_proof', maxCount: 1 }
  ]),
  registerValidator.businessDetails, 
  validate, 
  userController.businessDetails
);

export default router;