const express = require('express');
const router = express.Router();
const registerValidator  = require('../../../../src/validators/user');
const { validate } = require('../../../../src/middleware/validate');
const userController = require('../../../../src/controllers/userController')
const auth = require('../../../../src/middleware/auth')

//User Registration 
router.post('/', registerValidator.userRegister, validate, userController.register);
router.post('/login', registerValidator.userLogin, validate, userController.login);
router.post('/request-otp', registerValidator.otpGenrate, validate, userController.otpGenrate);
router.post('/varify-otp', registerValidator.verifyOtp, validate, userController.verifyOtp);
router.post('/add-warehouse', auth, registerValidator.sellerWarehouse, validate, userController.sellerWarehouse);
router.post('/add-bank-details', auth, registerValidator.createBankDetails, validate, userController.createBankDetails);

module.exports = router;