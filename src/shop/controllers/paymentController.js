import BaseController from './baseController.js';
import BaseService from '../services/baseService.js';
import orderService from '../services/orderService.js';
import { catchAsync } from '../utils/index.js';
import PhonePeUtils from "../utils/initiatePhonePePayment.js";
import { Cart, CartItem } from '../models/cart/index.js';

const { initiatePhonePePayment } = PhonePeUtils;

class PaymentController extends BaseController {
    constructor() {
        super();
        this.baseService = new BaseService();
    }

    initiate = catchAsync(async (req, res) => {

        const { redirectUrl } = req.body;

        if (!redirectUrl) {
            return res.status(400).json({
                success: false,
                message: "RedirectUrl are required",
            });
        }
        
        const result = await this.baseService.handleDBOperation(async () => {
            const merchantOrderId = `25-${Date.now()}`;

            const cart = await Cart.findOne({ customerId: req.customer._id, isActive: true });
            const amount = cart.finalAmount * 100;
            const callbackUrlWithOrder = `${redirectUrl}?merchantOrderId=${merchantOrderId}&status=`;
            const paymentResponse = await initiatePhonePePayment({
                merchantOrderId,
                amount,
                redirectUrl: callbackUrlWithOrder,
                message: "snnapzo order payment",
            });
            if (!paymentResponse.success) {
                throw new Error(paymentResponse.error || "Payment initiation failed");
            }

            const phonePeRedirectUrl = paymentResponse.rawResponse?.redirectUrl;
            if (!phonePeRedirectUrl) {
                throw new Error("Missing redirect URL in PhonePe response");
            }
            return {
                success: true,
                merchantOrderId,
                redirectUrl: phonePeRedirectUrl,
                rawResponse: paymentResponse.rawResponse,
            };
        });

        res.json(result);
    });
}

export default new PaymentController();
