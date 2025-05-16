import Order from '../models/orders/order.js';
import OrderProduct from '../models/orders/orderProduct.js';
import SellerPayment from '../models/earn/sellerPayment.js';
import mongoose from 'mongoose';

/**
 * Get dashboard statistics for a seller
 * @route GET /seller/accounts/dashboard
 */
export const getDashboardStats = async (req, res) => {
  try {
    const sellerId = req.user._id;
    
    // Get date range from query params or use default (last 30 days)
    const endDate = new Date();
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Find order products associated with this seller
    const orderProducts = await OrderProduct.find({
      sellerId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Get order IDs from the order products
    const orderProductIds = orderProducts.map(op => op._id);
    
    // Find all related orders
    const orders = await Order.find({ 
      orderProduct: { $in: orderProductIds }
    });
    
    // Calculate order statistics
    const pendingOrders = orders.filter(order => 
      ['pending', 'payment_received', 'confirmed', 'processing', 'ready_to_ship'].includes(order.status)
    ).length;
    
    const shippedOrders = orders.filter(order => 
      ['shipped', 'out_for_delivery'].includes(order.status)
    ).length;
    
    const returnOrders = orders.filter(order => 
      ['return_requested', 'return_in_process', 'returned', 'rto_return'].includes(order.status)
    ).length;
    
    const totalOrders = orders.length;
    
    // Get payment details for revenue calculation - using SellerPayment model
    const sellerPayments = await SellerPayment.find({
      seller_id: sellerId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate financial statistics
    let totalRevenue = 0;
    let totalShippingCharges = 0;
    let returnsValue = 0;
    
    // Calculate revenue from seller payments
    sellerPayments.forEach(payment => {
      // Add order amount to revenue
      totalRevenue += payment.order_amount || 0;
      
      // Add shipping charges
      totalShippingCharges += payment.shipping_charges || 0;
      
      // Track returns for deduction
      returnsValue += payment.return_shipping_charges || 0;
    });
    
    // If no payment data, fallback to order data
    if (sellerPayments.length === 0) {
      orders.forEach(order => {
        // Only count delivered orders toward revenue
        if (order.status === 'delivered') {
          totalRevenue += order.final_amount || 0;
        }
        totalShippingCharges += order.shipping || 0;
      });
    }
    
    // Prepare chart data by organizing orders by date
    const chartData = prepareChartData(orders, sellerPayments, startDate, endDate);
    
    // Prepare response data
    const dashboardData = {
      pendingOrders,
      totalOrders,
      shippedOrders,
      returnOrders,
      totalRevenue,
      totalShippingCharges,
      dateRange: {
        startDate,
        endDate
      },
      chartData
    };
    
    return res.status(200).json({
      success: true,
      data: dashboardData
    });
    
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while fetching dashboard data'
    });
  }
};

/**
 * Get detailed dashboard statistics for a seller
 * @route GET /seller/accounts/dashboard/details
 */
export const getDashboardDetails = async (req, res) => {
  try {
    const sellerId = req.user._id;
    
    // Get time period from query (daily, weekly, monthly)
    const period = req.query.period || 'daily';
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate;
    
    switch (period) {
      case 'weekly':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'daily':
      default:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
    }
    
    // Find order products associated with this seller
    const orderProducts = await OrderProduct.find({
      sellerId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    const orderProductIds = orderProducts.map(op => op._id);
    
    // Find all related orders
    const orders = await Order.find({ 
      orderProduct: { $in: orderProductIds }
    });
    
    // Get in-stock listings count (using available product count from order products)
    const inStockListings = await OrderProduct.countDocuments({
      sellerId,
      quantity: { $gt: 0 }
    });
    
    // Calculate views (this is a placeholder - implement actual view tracking)
    const views = 27; // Placeholder based on the UI mockup
    
    // Calculate outstanding payments
    const outstandingPayments = await SellerPayment.aggregate([
      {
        $match: {
          seller_id: new mongoose.Types.ObjectId(sellerId),
          payout_status: { $in: ['pending', 'processing'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$net_amount' }
        }
      }
    ]);
    
    const totalOutstandingPayment = outstandingPayments.length > 0 ? outstandingPayments[0].total : 0;
    
    // Get payment details for chart data
    const sellerPayments = await SellerPayment.find({
      seller_id: sellerId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Prepare chart data based on period
    const chartData = prepareChartData(orders, sellerPayments, startDate, endDate, period);
    
    // Prepare detailed response
    const detailedData = {
      views,
      ordersCount: orders.length,
      inStockListings,
      outstandingPayment: totalOutstandingPayment,
      period,
      dateRange: {
        startDate,
        endDate
      },
      chartData
    };
    
    return res.status(200).json({
      success: true,
      data: detailedData
    });
    
  } catch (error) {
    console.error('Error in getDashboardDetails:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while fetching dashboard details'
    });
  }
};

/**
 * Helper function to prepare chart data organized by date
 * @param {Array} orders - Array of orders
 * @param {Array} payments - Array of seller payments
 * @param {Date} startDate - Start date for the chart
 * @param {Date} endDate - End date for the chart
 * @param {String} period - Period (daily, weekly, monthly)
 * @returns {Object} Organized data for charts
 */
const prepareChartData = (orders, payments, startDate, endDate, period = 'daily') => {
  // Initialize the date buckets based on period
  const dateBuckets = {};
  const dateFormat = {};
  
  // Clone dates to avoid modifying the original
  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);
  
  // Format for keys based on period
  switch (period) {
    case 'weekly':
      // For weekly, we group by week number in the year
      while (currentDate <= lastDate) {
        const weekKey = getWeekNumber(currentDate);
        const formattedDate = `Week ${weekKey}`;
        dateFormat[weekKey] = formattedDate;
        
        if (!dateBuckets[weekKey]) {
          dateBuckets[weekKey] = {
            label: formattedDate,
            orderCount: 0,
            orderValue: 0,
            revenue: 0,
            returns: 0,
            shipping: 0
          };
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;
      
    case 'monthly':
      // For monthly, we group by month
      while (currentDate <= lastDate) {
        const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
        const formattedDate = `${currentDate.toLocaleString('default', { month: 'short' })} ${currentDate.getFullYear()}`;
        dateFormat[monthKey] = formattedDate;
        
        if (!dateBuckets[monthKey]) {
          dateBuckets[monthKey] = {
            label: formattedDate,
            orderCount: 0,
            orderValue: 0,
            revenue: 0,
            returns: 0,
            shipping: 0
          };
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;
      
    case 'daily':
    default:
      // For daily, we group by day
      while (currentDate <= lastDate) {
        const dateKey = formatDate(currentDate);
        const formattedDate = currentDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        dateFormat[dateKey] = formattedDate;
        
        if (!dateBuckets[dateKey]) {
          dateBuckets[dateKey] = {
            label: formattedDate,
            orderCount: 0,
            orderValue: 0,
            revenue: 0,
            returns: 0,
            shipping: 0
          };
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;
  }
  
  // Process orders
  orders.forEach(order => {
    let dateKey;
    const orderDate = order.createdAt || new Date();
    
    switch (period) {
      case 'weekly':
        dateKey = getWeekNumber(orderDate);
        break;
      case 'monthly':
        dateKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;
        break;
      case 'daily':
      default:
        dateKey = formatDate(orderDate);
        break;
    }
    
    // Skip if date is outside our range
    if (!dateBuckets[dateKey]) return;
    
    // Increment counters
    dateBuckets[dateKey].orderCount++;
    dateBuckets[dateKey].orderValue += order.final_amount || 0;
    
    // Only count delivered orders as revenue
    if (order.status === 'delivered') {
      dateBuckets[dateKey].revenue += order.final_amount || 0;
    }
    
    // Count returns
    if (['return_requested', 'return_in_process', 'returned', 'rto_return'].includes(order.status)) {
      dateBuckets[dateKey].returns++;
    }
    
    // Add shipping
    dateBuckets[dateKey].shipping += order.shipping || 0;
  });
  
  // Process payments if available for more accurate data
  payments.forEach(payment => {
    let dateKey;
    const paymentDate = payment.payment_date || payment.createdAt || new Date();
    
    switch (period) {
      case 'weekly':
        dateKey = getWeekNumber(paymentDate);
        break;
      case 'monthly':
        dateKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth() + 1}`;
        break;
      case 'daily':
      default:
        dateKey = formatDate(paymentDate);
        break;
    }
    
    // Skip if date is outside our range
    if (!dateBuckets[dateKey]) return;
    
    // Update from payment data (overrides order data for more accuracy)
    dateBuckets[dateKey].revenue = payment.order_amount || dateBuckets[dateKey].revenue;
    dateBuckets[dateKey].shipping = payment.shipping_charges || dateBuckets[dateKey].shipping;
    
    // Track returns
    if (payment.return_shipping_charges > 0) {
      dateBuckets[dateKey].returns = payment.return_shipping_charges;
    }
  });
  
  // Convert to array format for easier consumption by charts
  const chartDataArray = Object.values(dateBuckets);
  
  // Return organized data with series for different chart types
  return {
    // Array of labels (dates) for the X-axis
    labels: chartDataArray.map(item => item.label),
    
    // Different data series for various chart needs
    series: {
      orderCount: chartDataArray.map(item => item.orderCount),
      revenue: chartDataArray.map(item => item.revenue),
      returns: chartDataArray.map(item => item.returns),
      shipping: chartDataArray.map(item => item.shipping)
    },
    
    // Raw data for custom chart formatting
    rawData: chartDataArray
  };
};

/**
 * Helper function to format a date as YYYY-MM-DD
 */
const formatDate = (date) => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

/**
 * Helper function to get the week number of a date
 */
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};
