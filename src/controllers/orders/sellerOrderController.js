import Order from '../../models/orders/order.js';

export const getOrdersBySellerId = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const orders = await Order.find({ sellerId });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}; 