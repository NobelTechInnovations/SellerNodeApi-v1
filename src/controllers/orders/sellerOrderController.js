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

export const processOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_process } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if(order_process == "accept"){
      order.status = "processing";
    }else{
      order.status = "rejected";
    }
    await order.save();

    res.status(200).json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};


