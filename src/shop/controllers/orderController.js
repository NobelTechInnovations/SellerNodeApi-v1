import BaseController from './baseController.js';
import orderService from '../services/orderService.js';
import { catchAsync } from '../utils/index.js';


class OrderController extends BaseController {
    placeOrder = catchAsync(async (req, res) => {
        const result = await orderService.placeOrder(req.customer, req.body);
        return this.sendResponse(res, result, 'Order placed successfully');
    });
}

export default new OrderController();