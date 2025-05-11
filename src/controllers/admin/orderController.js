import Order from '../../models/orders/order.js';
import OrderProduct from '../../models/orders/orderProduct.js';
import OrderVendor from '../../models/orders/orderVendor.js';

export const storeOrder = async (req, res) => {
  try {
    const { order_products, order_vendor, ...orderData } = req.body;

    // Step 1: Create and save the order
    const newOrder = new Order(orderData);
    await newOrder.save();

    // Step 2: Insert order products and store their IDs
    if (order_products && order_products.length > 0) {
      const orderProducts = order_products.map(product => ({
        ...product,
        order_id: newOrder._id
      }));

      const insertedProducts = await OrderProduct.insertMany(orderProducts);
      const productIds = insertedProducts.map(p => p._id);

      // Update Order with product IDs
      await Order.findByIdAndUpdate(
        newOrder._id,
        { $set: { orderProduct: productIds } },
        { new: true }
      );
    }

    // Step 3: Save Order Vendor
    if (order_vendor && order_vendor.sellerId) {
      const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '');
      const order_vendor_id = `AGR-456-${timestamp}/${order_vendor.sellerId}`;

      const newOrderVendor = new OrderVendor({
        ...order_vendor,
        orderID: newOrder._id,
        order_vendor_id
      });

      await newOrderVendor.save();
    }

    // Step 4: Return final response
    res.status(201).json({ success: true, data: newOrder });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};
