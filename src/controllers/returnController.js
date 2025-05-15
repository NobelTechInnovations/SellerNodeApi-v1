import Order from '../models/orders/order.js';
import OrderProduct from '../models/orders/orderProduct.js';
import mongoose from 'mongoose';

// Get return statistics for a seller
export const getReturnStatistics = async (req, res) => {
  try {
    const sellerId = req.user._id;

    // Get date range from query params or use default (last 30 days)
    const endDate = new Date();
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Find order products for this seller
    const orderProducts = await OrderProduct.find({ 
      sellerId: sellerId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate({
      path: 'productId',
      select: 'name images category'
    });

    // Get all order IDs
    const orderIds = orderProducts.map(op => op._id);

    // Find all orders containing these products with relevant statuses
    const orders = await Order.find({
      orderProduct: { $in: orderIds },
      status: { 
        $in: [
          'shipped', 
          'delivered', 
          'return_requested', 
          'return_in_process', 
          'returned', 
          'rto_return'
        ] 
      }
    });

    // Calculate statistics
    const totalShipped = orders.filter(order => order.status === 'shipped').length;
    const totalDelivered = orders.filter(order => order.status === 'delivered').length;
    const totalReturned = orders.filter(order => 
      ['return_requested', 'return_in_process', 'returned'].includes(order.status)
    ).length;
    const totalRTO = orders.filter(order => order.status === 'rto_return').length;

    // Group products by productId (not orderProduct)
    const productStats = [];
    const productMap = new Map();

    // First create a mapping of orderProductId to actual productId and product details
    const orderProductToProductMap = {};
    orderProducts.forEach(op => {
      if (op.productId) {
        orderProductToProductMap[op._id.toString()] = {
          productId: op.productId._id,
          productDetails: {
            id: op.productId._id,
            name: op.productId.name,
            image: op.productId.images && op.productId.images.length > 0 
              ? op.productId.images[0] 
              : null,
            category: op.productId.category,
            sku: op.sku || 'N/A'
          }
        };
      }
    });

    // Process each order to build product statistics
    orders.forEach(order => {
      const orderProductId = order.orderProduct;
      if (!orderProductId) return;
      
      const orderProductIdStr = orderProductId.toString();
      
      // Skip if we don't have mapping
      if (!orderProductToProductMap[orderProductIdStr]) return;
      
      // Get the actual productId
      const { productId, productDetails } = orderProductToProductMap[orderProductIdStr];
      const productIdStr = productId.toString();

      // Find or initialize product in map
      if (!productMap.has(productIdStr)) {
        productMap.set(productIdStr, {
          productId: productId,
          name: productDetails.name,
          image: productDetails.image,
          category: productDetails.category,
          sku: productDetails.sku,
          totalOrders: 0,
          totalShipped: 0,
          totalDelivered: 0,
          totalReturned: 0,
          returnRate: 0
        });
      }

      const stats = productMap.get(productIdStr);
      stats.totalOrders += 1;
      
      // Update stats based on order status
      if (order.status === 'shipped') {
        stats.totalShipped += 1;
      } else if (order.status === 'delivered') {
        stats.totalDelivered += 1;
      } else if (['return_requested', 'return_in_process', 'returned'].includes(order.status)) {
        stats.totalReturned += 1;
      }

      // Update return rate
      if (stats.totalDelivered > 0) {
        stats.returnRate = (stats.totalReturned / stats.totalDelivered) * 100;
      }

      productMap.set(productIdStr, stats);
    });

    // Convert map to array and sort by return rate (if no returns, sort by delivery count)
    productMap.forEach(value => productStats.push(value));
    productStats.sort((a, b) => {
      if (b.returnRate === a.returnRate) {
        return b.totalDelivered - a.totalDelivered;
      }
      return b.returnRate - a.returnRate;
    });

    // Calculate overall return rate
    const returnRate = totalDelivered > 0 
      ? (totalReturned / totalDelivered) * 100 
      : 0;

    // Calculate RTO rate
    const rtoRate = (totalDelivered + totalShipped) > 0 
      ? (totalRTO / (totalDelivered + totalShipped)) * 100 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalShipped,
          totalDelivered,
          totalReturned,
          totalRTO,
          totalOrders: orders.length,
          returnRate: parseFloat(returnRate.toFixed(2)),
          rtoRate: parseFloat(rtoRate.toFixed(2))
        },
        productPerformance: productStats
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get return details for a specific product
export const getProductReturnDetails = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { productId } = req.params;

    // Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product ID' });
    }

    // Find order products for this seller and product
    const orderProducts = await OrderProduct.find({ 
      sellerId: sellerId,
      productId: productId
    });

    // Get all order IDs
    const orderIds = orderProducts.map(op => op._id);

    // Find all orders containing this product with relevant statuses
    const orders = await Order.find({
      orderProduct: { $in: orderIds },
      status: { 
        $in: [
          'shipped', 
          'delivered', 
          'return_requested', 
          'return_in_process', 
          'returned', 
          'rto_return'
        ] 
      }
    }).populate({
      path: 'customer_id',
      select: 'name email phone'
    });

    // Separate orders by status
    const shippedOrders = orders.filter(order => order.status === 'shipped');
    const deliveredOrders = orders.filter(order => order.status === 'delivered');
    const returnedOrders = orders.filter(order => 
      ['return_requested', 'return_in_process', 'returned'].includes(order.status)
    );
    const rtoOrders = orders.filter(order => order.status === 'rto_return');

    res.status(200).json({
      success: true,
      data: {
        totalShipped: shippedOrders.length,
        totalDelivered: deliveredOrders.length,
        totalReturned: returnedOrders.length,
        totalRTO: rtoOrders.length,
        returnRate: deliveredOrders.length > 0 
          ? parseFloat(((returnedOrders.length / deliveredOrders.length) * 100).toFixed(2)) 
          : 0,
        rtoRate: (deliveredOrders.length + shippedOrders.length) > 0
          ? parseFloat(((rtoOrders.length / (deliveredOrders.length + shippedOrders.length)) * 100).toFixed(2))
          : 0,
        shippedOrders,
        deliveredOrders,
        returnedOrders,
        rtoOrders
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
