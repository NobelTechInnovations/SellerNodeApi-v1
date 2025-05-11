import express from 'express';
import * as registerValidator from '../../../../src/validators/user.js';
import { validate } from '../../../../src/middleware/validate.js';
import * as userController from '../../../../src/controllers/userController.js';
import auth from '../../../../src/middleware/auth.js';

const router = express.Router();

//User Registration 
router.post('/register', registerValidator.userRegister, validate, userController.register);
router.post('/login', registerValidator.userLogin, validate, userController.login);
router.post('/request-otp', registerValidator.otpGenrate, validate, userController.otpGenrate);
router.post('/verify-otp', registerValidator.verifyOtp, validate, userController.verifyOtp);
router.post('/add-warehouse', auth, registerValidator.sellerWarehouse, validate, userController.sellerWarehouse);
router.post('/add-warehouse', auth, registerValidator.sellerWarehouse, validate, userController.sellerWarehouse);
router.post('/business-data', auth, registerValidator.businessDetails, validate, userController.businessDetails);

export default router;