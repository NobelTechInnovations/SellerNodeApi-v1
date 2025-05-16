import Order from '../models/orders/order.js';
import OrderProduct from '../models/orders/orderProduct.js';
import SellerPayment from '../models/earn/sellerPayment.js';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import ProductDescription from '../models/products/productDescription.js';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

/**
 * Generate and download sales report in xlsx format
 * @route GET /seller/dashboard/sales-report
 */
export const getSalesReport = async (req, res) => {
  try {
    const sellerId = req.user._id;
    
    // Use start date from request or default to beginning of time
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate) 
      : new Date(0); // Jan 1, 1970
    
    const endDate = new Date(); // Current date
    
    // Find order products associated with this seller
    const orderProducts = await OrderProduct.find({
      sellerId
    }).populate('productId');
    
    if (!orderProducts || orderProducts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No orders found for this seller'
      });
    }
    
    // Get order IDs from the order products
    const orderProductIds = orderProducts.map(op => op._id);
    
    // Find all related orders
    const orders = await Order.find({ 
      orderProduct: { $in: orderProductIds }
    }).populate('customer_id');
    
    // Get all product descriptions for product names
    const productIds = orderProducts
      .filter(op => op.productId)
      .map(op => op.productId._id);
    
    const productDescriptions = await ProductDescription.find({
      product: { $in: productIds },
      language: 'en'
    });
    
    // Create a map of productId -> title for quick lookup
    const productNameMap = {};
    productDescriptions.forEach(desc => {
      productNameMap[desc.product.toString()] = desc.title;
    });
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
    
    // Define columns
    worksheet.columns = [
      { header: 'Order Number', key: 'orderNumber', width: 15 },
      { header: 'Order Date', key: 'orderDate', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Product', key: 'product', width: 30 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Order Value (₹)', key: 'orderValue', width: 15 },
      { header: 'Shipping (₹)', key: 'shipping', width: 15 },
      { header: 'Total Amount (₹)', key: 'totalAmount', width: 15 }
    ];
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'CAD9EB' }
    };
    
    // Add rows
    for (const order of orders) {
      // Find corresponding order product
      const orderProduct = orderProducts.find(op => 
        op._id.toString() === order.orderProduct.toString()
      );
      
      if (!orderProduct) continue;
      
      // Get product details
      const product = orderProduct.productId;
      let productName = 'Unknown Product';
      
      if (product) {
        // Try to get product name from the description map first
        productName = productNameMap[product._id.toString()] || 
                     (product.name || 'Unknown Product');
      }
      
      const sku = product ? (product.unified_sku || orderProduct.sku || 'N/A') : 'N/A';
      
      // Get customer details
      const customer = order.customer_id 
        ? `${order.customer_id.name || ''} (${order.customer_email})`
        : order.customer_email || 'Unknown Customer';
      
      // Format date
      const orderDate = order.createdAt 
        ? new Date(order.createdAt).toLocaleString()
        : 'Unknown Date';
        
      // Add the row
      worksheet.addRow({
        orderNumber: order.order_number,
        orderDate: orderDate,
        status: order.status,
        customer: customer,
        product: productName,
        sku: sku,
        quantity: orderProduct.quantity || 1,
        orderValue: order.sub_total_amount || 0,
        shipping: order.shipping || 0,
        totalAmount: order.final_amount || 0
      });
    }
    
    // Add summary at the bottom
    const totalRows = worksheet.rowCount;
    worksheet.addRow([]); // Empty row
    
    // Summary row
    worksheet.addRow({
      orderNumber: 'TOTAL',
      orderValue: orders.reduce((sum, order) => sum + (order.sub_total_amount || 0), 0),
      shipping: orders.reduce((sum, order) => sum + (order.shipping || 0), 0),
      totalAmount: orders.reduce((sum, order) => sum + (order.final_amount || 0), 0)
    });

    const summaryRow = worksheet.lastRow;
    summaryRow.font = { bold: true };
    summaryRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8DC' }
      };
    });
    
    // Generate a unique filename
    const filename = `sales_report_${crypto.randomBytes(4).toString('hex')}_${Date.now()}.xlsx`;
    const filePath = path.join(uploadsDir, filename);
    
    // Write the file as xlsx
    await workbook.xlsx.writeFile(filePath);
    
    // Send the file
    res.download(filePath, `Agora_Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`, (err) => {
      if (err) {
        console.error("Error sending file:", err);
      }
      
      // Delete the file after sending
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Error deleting temporary file:", unlinkErr);
        }
      });
    });
    
  } catch (error) {
    console.error('Error generating sales report:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while generating the sales report'
    });
  }
};

/**
 * Generate and download return orders report in CSV format
 * @route GET /seller/dashboard/returns-report
 */
export const getReturnsReport = async (req, res) => {
  try {
    const sellerId = req.user._id;
    
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(0); // Jan 1, 1970
    
    const endDate = new Date();
    
    // Simple approach: get all the data first
    const orderProducts = await OrderProduct.find({ sellerId }).populate('productId');
    
    if (!orderProducts || orderProducts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No orders found for this seller'
      });
    }
    
    const orderProductIds = orderProducts.map(op => op._id);
    
    // Get return orders only
    const returnOrders = await Order.find({ 
      orderProduct: { $in: orderProductIds },
      status: { $in: ['return_requested', 'return_in_process', 'returned', 'rto_return'] }
    }).populate('customer_id');
    
    if (!returnOrders || returnOrders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No return orders found for this seller'
      });
    }
    
    // Get product descriptions for better product names
    const productIds = [];
    orderProducts.forEach(op => {
      if (op.productId && op.productId._id) {
        productIds.push(op.productId._id);
      }
    });
    
    const productDescriptions = await ProductDescription.find({
      product: { $in: productIds },
      language: 'en'
    });
    
    const productNameMap = {};
    productDescriptions.forEach(desc => {
      if (desc.product) {
        productNameMap[desc.product.toString()] = desc.title;
      }
    });
    
    // Get payment data for return shipping charges
    const sellerPayments = await SellerPayment.find({
      seller_id: sellerId
    });
    
    const orderPaymentMap = {};
    sellerPayments.forEach(payment => {
      if (payment.orders && Array.isArray(payment.orders)) {
        payment.orders.forEach(orderItem => {
          if (orderItem && orderItem.is_return && orderItem.order_id) {
            orderPaymentMap[orderItem.order_id.toString()] = {
              returnShippingCharge: orderItem.return_shipping_charge || 0,
              returnDate: orderItem.return_date
            };
          }
        });
      }
    });
    
    // Create CSV content directly
    let csvContent = 'Order Number,Order Date,Return Status,Customer,Product,SKU,Quantity,Order Value (₹),Return Shipping (₹),Return Date\n';
    
    let totalOrderValue = 0;
    let totalReturnShipping = 0;
    
    // Add each order as a row
    returnOrders.forEach(order => {
      const orderProduct = orderProducts.find(op => 
        op._id.toString() === order.orderProduct.toString()
      );
      
      if (!orderProduct) return;
      
      // Get product details
      let productName = 'Unknown Product';
      let sku = 'N/A';
      
      if (orderProduct.productId) {
        const prodId = orderProduct.productId._id.toString();
        productName = productNameMap[prodId] || 
                     (orderProduct.productId.name || 'Unknown Product');
        sku = orderProduct.productId.unified_sku || orderProduct.sku || 'N/A';
      }
      
      // Escape any commas in text fields for CSV
      productName = productName.replace(/,/g, ' ');
      
      // Get customer details
      let customer = order.customer_email || 'Unknown Customer';
      if (order.customer_id && order.customer_id.name) {
        customer = `${order.customer_id.name} (${order.customer_email})`;
      }
      customer = customer.replace(/,/g, ' ');
      
      // Get return details
      const paymentData = orderPaymentMap[order._id.toString()] || {};
      const returnShippingCharge = paymentData.returnShippingCharge || 0;
      const returnDate = paymentData.returnDate 
        ? new Date(paymentData.returnDate).toLocaleDateString()
        : 'Processing';
      
      // Add to totals
      const orderValue = order.final_amount || 0;
      totalOrderValue += orderValue;
      totalReturnShipping += returnShippingCharge;
      
      // Format date
      const orderDate = order.createdAt 
        ? new Date(order.createdAt).toLocaleDateString()
        : 'Unknown Date';
      
      // Add row to CSV
      csvContent += `${order.order_number},${orderDate},${order.status},${customer},${productName},${sku},${orderProduct.quantity || 1},${orderValue},${returnShippingCharge},${returnDate}\n`;
    });
    
    // Add empty row and total
    csvContent += `\n`;
    csvContent += `TOTAL,,,,,,,,${totalOrderValue},${totalReturnShipping}\n`;
    
    // Generate file
    const filename = `returns_report_${Date.now()}.csv`;
    const filePath = path.join(uploadsDir, filename);
    
    // Write the CSV file
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    // Send the file
    res.download(filePath, `Agora_Returns_Report_${new Date().toLocaleDateString()}.csv`, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        return res.status(500).json({
          success: false,
          error: 'Error downloading file'
        });
      }
      
      // Clean up the file
      fs.unlink(filePath, () => {});
    });
    
  } catch (error) {
    console.error('Error generating returns report:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while generating the returns report'
    });
  }
};