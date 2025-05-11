import Order from '../../models/orders/order.js';
import OrderProduct from '../../models/orders/orderProduct.js';
import OrderVendor from '../../models/orders/OrderVendor.js';

export const storeOrder = async (req, res) => {
  try {
    const { order_products, order_vendor, ...orderData } = req.body;
    const newOrder = new Order(orderData);
    await newOrder.save();

    // Save order products
    if (order_products && order_products.length > 0) {
      const orderProducts = order_products.map(product => ({
        ...product,
        order_id: newOrder._id
      }));
      await OrderProduct.insertMany(orderProducts);
    }

    // Save order vendor
    if (order_vendor) {
      const newOrderVendor = new OrderVendor({
        ...order_vendor,
        orderID: newOrder._id
      });
      await newOrderVendor.save();
    }

    res.status(201).json({ success: true, data: newOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}; 