import Order from '../../models/orders/order.js';
import OrderProduct from '../../models/orders/orderProduct.js';

export const getOrdersBySellerId = async (req, res) => {
  try {
    const sellerId = req.user._id;

    // Scoped to this seller only — every order now belongs to exactly one
    // seller (see orderService.placeOrder), so this is a direct, secure
    // filter rather than the previous Order.find({}) which returned every
    // seller's orders to any logged-in seller.
    // .populate('orderCustomer') so the seller can see the real delivery
    // address/phone for this order (previously never fetched at all, so
    // the seller panel always showed blank delivery details).
    const orders = await Order.find({ seller_id: sellerId }).populate('orderCustomer').lean();

    const orderIds = orders.map((o) => o._id);
    const items = await OrderProduct.find({ order_id: { $in: orderIds } }).lean();
    const itemsByOrderId = {};
    for (const item of items) {
      const key = item.order_id.toString();
      if (!itemsByOrderId[key]) itemsByOrderId[key] = [];
      itemsByOrderId[key].push(item);
    }

    // Group by status
    const groupedOrders = {
      pending: [],
      processing: [],
      ready_to_pickup: [],
      driver_accepted: [],
      shipped: [],
      rejected: [],
      ready_to_ship: [],
      cancelled: [],
      delivered: [],
    };

    orders.forEach(order => {
      order.items = itemsByOrderId[order._id.toString()] || [];
      if (groupedOrders[order.status]) {
        groupedOrders[order.status].push(order);
      } else {
        groupedOrders.pending.push(order);
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
    const sellerId = req.user._id;

    // Ownership check baked directly into the query — a seller can only
    // ever find/mutate their own order, never another seller's, even by
    // guessing an id (each order belongs to exactly one seller now).
    const order = await Order.findOne({ _id: orderId, seller_id: sellerId });
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
