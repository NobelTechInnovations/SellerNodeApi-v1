import BaseService from './baseService.js';
import Order from '../../models/orders/order.js';

class OrderService extends BaseService {

    async placeOrder(customer, orderData) {
        return await this.handleDBOperation(async () => {
            const order = await Order.create({
                customerId: customer._id,
                ...orderData
            });
            return order;
        });
    }
}

export default new OrderService();