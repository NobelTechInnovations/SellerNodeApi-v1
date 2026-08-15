import BaseController from './baseController.js';
import orderService from '../services/orderService.js';
import { catchAsync } from '../utils/index.js';


class OrderController extends BaseController {
    placeOrder = catchAsync(async (req, res) => {
        const result = await orderService.placeOrder(req.customer, req.body);
        return this.sendResponse(res, result, 'Order placed successfully');
    });

    getMyOrders = catchAsync(async (req, res) => {
        const result = await orderService.getMyOrders(req.customer);
        return this.sendResponse(res, result, 'Orders fetched successfully');
    });

    getOrderDetail = catchAsync(async (req, res) => {
        const result = await orderService.getOrderDetail(req.customer, req.params.orderId);
        return this.sendResponse(res, result, 'Order detail fetched successfully');
    });
}

export default new OrderController();
