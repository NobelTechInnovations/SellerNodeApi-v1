import BaseController from './baseController.js';
import customerAuthService from '../services/customerAuthService.js';
import { catchAsync } from '../utils/index.js';

class CustomerAuthController extends BaseController {
    requestOTP = catchAsync(async (req, res) => {
        const { phone } = req.body;
        const result = await customerAuthService.requestOTP(phone);
        
        return this.sendResponse(res, result, 'OTP sent successfully');
    });

    verifyOTP = catchAsync(async (req, res) => {
        const { phone, otp } = req.body;
        const result = await customerAuthService.verifyOTP(phone, otp);
        
        return this.sendResponse(res, result, 'OTP verified successfully');
    });
}

export default new CustomerAuthController(); 