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

    getAuthProfile = catchAsync(async (req,res) => {
               
        if (!req.customer) {
            return this.sendError(res, 'Customer not authenticated', null, 401);
        }

        const result = await customerAuthService.getAuthProfile(req.customer.id);

        return this.sendResponse(res, result, 'profile fetched');
    })

    updateProfile = catchAsync(async (req,res) => {
        const { customer } = req;
        const result = await customerAuthService.updateProfile(customer, req.body);
        return this.sendResponse(res, result, 'profile updated');
    })

    customerBankAdd = catchAsync(async (req,res) => {
        const { customer } = req;
        const result = await customerAuthService.customerBankAdd(customer, req.body);
        return this.sendResponse(res, result, 'bank added');
    })

    customerPaymentMethodAdd = catchAsync(async (req,res) => {
        const { customer } = req;
        const result = await customerAuthService.customerPaymentMethodAdd(customer, req.body);
        return this.sendResponse(res, result, 'payment method added');
    })
}

export default new CustomerAuthController(); 