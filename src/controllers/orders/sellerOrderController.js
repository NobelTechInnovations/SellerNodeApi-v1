import Order from '../../models/orders/order.js';

export const getOrdersBySellerId = async (req, res) => {
  try {
    const sellerId = req.user._id;
  
    // Fetch orders and populate orderProducts if it's a ref
    const orders = await Order.find({}).populate("orderProduct");
  
    // Group by status
    const groupedOrders = {
      pending: [],
      processing: [],
      shipped: [],
      rejected: [],
      ready_to_ship: [],
      cancelled: [],
      delivered: [],
    };
  
    orders.forEach(order => {
      if (groupedOrders[order.status]) {
        groupedOrders[order.status].push(order);
      }
    });
  
    res.status(200).json({ success: true, data: groupedOrders });
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
    }else if(order_process == "ready_to_ship"){
      order.status = "ready_to_ship";
    }else{
      order.status = "rejected";
    }
    await order.save();

    res.status(200).json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};


