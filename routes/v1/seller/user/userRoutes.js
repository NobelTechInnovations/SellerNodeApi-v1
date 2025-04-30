const express = require('express');
const router = express.Router();
const registerValidator  = require('../../../../src/validators/user');
const { validate } = require('../../../../src/middleware/validate');
const userController = require('../../../../src/controllers/userController')

//User Registration 
router.post('/', registerValidator.userRegister, validate, userController.register);
router.post('/login', registerValidator.userLogin, validate, userController.login);
router.post('/otpGenrate', registerValidator.otpGenrate, validate, userController.otpGenrate);
router.post('/verifyOtp', registerValidator.verifyOtp, validate, userController.verifyOtp);
router.post('/warehouse', registerValidator.sellerWarehouse, validate, userController.sellerWarehouse);

module.exports = router;