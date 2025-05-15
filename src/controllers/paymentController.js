import Order from '../models/orders/order.js';
import OrderProduct from '../models/orders/orderProduct.js';
import SellerPayment from '../models/earn/sellerPayment.js';
import SellerPaymentSummary from '../models/earn/sellerPaymentSummary.js';
import mongoose from 'mongoose';

/**
 * Get the overall payment summary for a seller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPaymentSummary = async (req, res) => {
  try {
    const sellerId = req.user._id;

    // Find or create the payment summary for the seller
    let paymentSummary = await SellerPaymentSummary.findOne({ seller_id: sellerId });
    
    if (!paymentSummary) {
      // If no summary exists, create a new one
      paymentSummary = await SellerPaymentSummary.create({
        seller_id: sellerId,
        total_earnings: 0,
        total_paid: 0,
        outstanding_amount: 0,
        pending_returns_amount: 0
      });
    }

    // Get the payment trends for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const paymentTrends = await SellerPayment.aggregate([
      { $match: { seller_id: new mongoose.Types.ObjectId(sellerId), createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$net_amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        payments_to_date: paymentSummary.total_paid,
        total_outstanding_payment: paymentSummary.outstanding_amount,
        next_payment: {
          amount: paymentSummary.next_payout_amount,
          date: paymentSummary.next_payout_date
        },
        last_payment: {
          amount: paymentSummary.last_payout_amount,
          date: paymentSummary.last_payout_date
        },
        payment_trends: paymentTrends
      }
    });
  } catch (error) {
    console.error('Error in getPaymentSummary:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching payment summary',
      error: error.message
    });
  }
};

/**
 * Get detailed payment information with all transactions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    
    // Calculate pagination values
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find payment records for the seller
    const payments = await SellerPayment.find({ seller_id: sellerId })
      .sort({ payment_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    // Get the total count for pagination
    const totalCount = await SellerPayment.countDocuments({ seller_id: sellerId });

    // Get the summary
    const paymentSummary = await SellerPaymentSummary.findOne({ seller_id: sellerId });
    
    // If no summary exists, return empty data
    if (!paymentSummary) {
      return res.status(200).json({
        success: true,
        data: {
          total_net_order_amount: 0,
          total_net_ads_cost: 0,
          total_net_referral_earning: 0,
          total_amount: 0,
          total_return_shipping_charges: 0,
          total_shipping_charges: 0,
          payments: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0
          }
        }
      });
    }
    
    // Process the payments to send in the desired format
    const formattedPayments = payments.map(payment => {
      // Count orders that are returns
      const returnOrders = payment.orders.filter(
        order => order.is_return === true
      );
      
      // Calculate shipping charges from orders
      const shippingCharges = payment.orders.reduce((total, order) => {
        // Include shipping charges for delivered and shipped orders only
        if (order.status === 'delivered' || order.status === 'shipped') {
          return total + (order.shipping_charge || 0);
        }
        return total;
      }, 0);
      
      return {
        payment_date: payment.payment_date,
        order_amount: payment.order_amount,
        ads_cost: payment.ads_cost,
        referrals: payment.referral_earnings,
        return_shipping_charges: payment.return_shipping_charges,
        return_count: returnOrders.length,
        shipping_charges: shippingCharges,
        net_amount: payment.net_amount,
        status: payment.payout_status,
        details: payment._id // Reference to view detailed breakdown
      };
    });
    
    // Calculate totals
    const totalReturnShippingCharges = payments.reduce((total, payment) => 
      total + (payment.return_shipping_charges || 0), 0);
      
    const totalShippingCharges = formattedPayments.reduce((total, payment) => 
      total + (payment.shipping_charges || 0), 0);
    
    return res.status(200).json({
      success: true,
      data: {
        total_net_order_amount: paymentSummary.outstanding_amount,
        total_net_ads_cost: 0, // Calculate from your ads model if available
        total_net_referral_earning: 0, // Calculate from your referral model if available
        total_amount: paymentSummary.outstanding_amount,
        total_return_shipping_charges: totalReturnShippingCharges,
        total_shipping_charges: totalShippingCharges,
        payments: formattedPayments,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('Error in getPaymentDetails:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching payment details',
      error: error.message
    });
  }
};

/**
 * Get single payment transaction details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSinglePaymentDetails = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { paymentId } = req.params;
    
    // Validate the payment ID
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format'
      });
    }
    
    // Find the payment with populated order details
    const payment = await SellerPayment.findOne({
      _id: paymentId,
      seller_id: sellerId
    }).populate({
      path: 'orders.order_id orders.product_id',
      populate: {
        path: 'orderProduct', // Populate orderProduct to get more product details
        select: 'product_instance'
      }
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Calculate shipping charges from orders
    const shippingCharges = payment.orders.reduce((total, order) => {
      // Include shipping charges for delivered and shipped orders only
      if (order.status === 'delivered' || order.status === 'shipped') {
        return total + (order.shipping_charge || 0);
      }
      return total;
    }, 0);
    
    // Separate regular orders from return shipping charges
    const regularOrders = [];
    const returnShippingCharges = [];
    
    payment.orders.forEach(order => {
      // Get product name from different possible sources
      const productName = 
        (order.product_id && order.product_id.name) || 
        (order.product_id && order.product_id.orderProduct && 
         order.product_id.orderProduct.product_instance && 
         order.product_id.orderProduct.product_instance.name) ||
        'Unknown Product';
        
      if (order.status === 'return_shipping_charge') {
        returnShippingCharges.push({
          order_id: order.order_id?._id,
          order_number: order.order_id?.order_number,
          product_name: productName,
          amount: order.amount,
          status: order.status,
          description: order.description,
          return_date: order.return_date,
          return_shipping_charge: order.return_shipping_charge
        });
      } else {
        regularOrders.push({
          order_id: order.order_id?._id,
          order_number: order.order_id?.order_number,
          product_name: productName,
          amount: order.amount,
          status: order.status,
          delivery_date: order.delivery_date,
          is_return: order.is_return,
          return_date: order.return_date,
          shipping_charge: order.shipping_charge || 0
        });
      }
    });
    
    // Format the payment details
    const paymentDetails = {
      payment_id: payment._id,
      payment_date: payment.payment_date,
      status: payment.payout_status,
      order_amount: payment.order_amount,
      ads_cost: payment.ads_cost,
      referral_earnings: payment.referral_earnings,
      shipping_charges: shippingCharges,
      return_shipping_charges: payment.return_shipping_charges,
      net_amount: payment.net_amount,
      transaction_id: payment.transaction_id,
      orders: regularOrders,
      return_shipping_charges_details: returnShippingCharges
    };
    
    return res.status(200).json({
      success: true,
      data: paymentDetails
    });
    
  } catch (error) {
    console.error('Error in getSinglePaymentDetails:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching payment details',
      error: error.message
    });
  }
};

/**
 * Calculate and update the seller's payment data
 * This function should be called by a scheduled job every 24 hours
 */
export const calculateSellerPayments = async (req, res) => {
  try {
    // Get the seller ID from the authenticated user or from params
    const sellerId = req.params.sellerId || (req.user && req.user._id);
    
    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: 'Seller ID is required'
      });
    }

    console.log(`Calculating payments for seller: ${sellerId}`);
    
    // Step 1: Get already processed order product IDs
    const processedPayments = await SellerPayment.find({ seller_id: sellerId });
    const processedOrderProductIds = new Set();
    
    processedPayments.forEach(payment => {
      payment.orders.forEach(order => {
        if (order.order_product_id) {
          processedOrderProductIds.add(order.order_product_id.toString());
        }
      });
    });
    
    console.log(`Found ${processedOrderProductIds.size} already processed order products`);
    
    // Step 2: Find all delivered or returned orders from yesterday (24 hours ago)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    // Find all OrderProduct records for this seller that haven't been processed yet
    const orderProducts = await OrderProduct.find({
      sellerId: sellerId,
      // Exclude already processed order products
      _id: { $nin: Array.from(processedOrderProductIds) }
    }).populate('productId');
    
    console.log(`Found ${orderProducts.length} unprocessed order products for this seller`);
    
    // Step 3: Process each order product
    let totalOrderAmount = 0;
    let totalReturnShippingCharges = 0;
    let totalShippingCharges = 0;
    const orderDetails = [];
    const returnShippingDetails = []; // New array to track return shipping charges
    
    for (const orderProduct of orderProducts) {
      try {
        // Find the corresponding order
        const order = await Order.findOne({ orderProduct: orderProduct._id });
        
        if (!order) {
          console.log(`No order found for orderProduct: ${orderProduct._id}`);
          continue;
        }
        
        console.log(`Processing order: ${order._id} with status: ${order.status}`);
        
        // Check if the order is delivered or shipped (both should be counted for payment)
        if (order.status === 'delivered' || order.status === 'shipped') {
          // Add to total earnings
          const amount = orderProduct.total || 0;
          totalOrderAmount += amount;
          
          // Get shipping charge
          const shippingCharge = orderProduct.shipping || 0;
          totalShippingCharges += shippingCharge;
          
          orderDetails.push({
            order_id: order._id,
            product_id: orderProduct.productId,
            order_product_id: orderProduct._id,
            amount: amount,
            status: order.status,
            delivery_date: order.updatedAt || order.createdAt,
            is_return: false,
            shipping_charge: shippingCharge
          });
          
          console.log(`Added ${order.status} product: ${orderProduct._id}, amount: ${amount}, shipping: ${shippingCharge}`);
        }
        
        // Check if the order is returned
        else if (order.status === 'returned') {
          // Calculate return shipping charges (30 rupees per returned item in your example)
          const returnShippingCharge = 30; // Fixed charge per your requirement
          totalReturnShippingCharges += returnShippingCharge;
          
          // Add the refund entry
          orderDetails.push({
            order_id: order._id,
            product_id: orderProduct.productId,
            order_product_id: orderProduct._id,
            amount: -(orderProduct.total || 0), // Negative to indicate refund
            status: order.status,
            delivery_date: order.createdAt,
            is_return: true,
            return_date: order.updatedAt || order.createdAt,
            return_shipping_charge: 0, // Set to 0 as we'll record it separately
            shipping_charge: 0 // No shipping charge for returns
          });
          
          // Add a separate entry for the return shipping charge
          returnShippingDetails.push({
            order_id: order._id,
            product_id: orderProduct.productId,
            order_product_id: orderProduct._id,
            amount: -returnShippingCharge, // Negative to indicate deduction
            status: 'return_shipping_charge',
            description: `Return shipping charge for order ${order.order_number || order._id}`,
            return_date: order.updatedAt || order.createdAt,
            return_shipping_charge: returnShippingCharge,
            shipping_charge: 0 // No shipping charge for this entry
          });
          
          console.log(`Added returned product: ${orderProduct._id}, refund: ${-(orderProduct.total || 0)}`);
          console.log(`Added return shipping charge: ${returnShippingCharge}`);
        }
      } catch (error) {
        console.error(`Error processing orderProduct ${orderProduct._id}:`, error);
      }
    }
    
    // Combine the regular orders and return shipping charges
    const allOrderDetails = [...orderDetails, ...returnShippingDetails];
    
    console.log(`Processed ${orderDetails.length} new order products for payment`);
    console.log(`Added ${returnShippingDetails.length} return shipping charges`);
    console.log(`Total shipping charges: ${totalShippingCharges}`);
    
    // Step 4: Calculate net amount
    const netAmount = totalOrderAmount + totalShippingCharges - totalReturnShippingCharges;
    
    console.log(`Total order amount: ${totalOrderAmount}, shipping charges: ${totalShippingCharges}, return shipping charges: ${totalReturnShippingCharges}, net amount: ${netAmount}`);
    
    // Step 5: Create a new payment record
    if (allOrderDetails.length > 0) {
      const payment = await SellerPayment.create({
        seller_id: sellerId,
        payment_date: new Date(),
        payout_status: 'pending',
        order_amount: totalOrderAmount,
        shipping_charges: totalShippingCharges, // Add shipping charges
        return_shipping_charges: totalReturnShippingCharges,
        net_amount: netAmount,
        orders: allOrderDetails // Include both regular orders and shipping charges
      });
      
      // Step 6: Update the seller payment summary
      const summary = await SellerPaymentSummary.findOneAndUpdate(
        { seller_id: sellerId },
        {
          $inc: {
            outstanding_amount: netAmount
          },
          $set: {
            next_payout_date: new Date(new Date().setDate(new Date().getDate() + 1)), // Next day
            next_payout_amount: netAmount
          }
        },
        { new: true, upsert: true }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Payment calculated successfully',
        data: {
          payment_id: payment._id,
          net_amount: netAmount,
          order_amount: totalOrderAmount,
          shipping_charges: totalShippingCharges,
          return_shipping_charges: totalReturnShippingCharges,
          order_count: orderDetails.length,
          return_count: returnShippingDetails.length
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'No new payments to calculate',
        data: {
          net_amount: 0,
          order_amount: 0,
          shipping_charges: 0,
          return_shipping_charges: 0,
          order_count: 0,
          return_count: 0
        }
      });
    }
    
  } catch (error) {
    console.error('Error in calculateSellerPayments:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while calculating payments',
      error: error.message
    });
  }
};

/**
 * Process actual payment to the seller (mark as completed)
 * This would typically be called after payment is actually made via payment gateway
 */
export const processSellerPayment = async (req, res) => {
  try {
    const { paymentId, transactionId } = req.body;
    
    // Validate payment ID
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format'
      });
    }
    
    // Update the payment status
    const payment = await SellerPayment.findByIdAndUpdate(
      paymentId,
      {
        payout_status: 'completed',
        transaction_id: transactionId
      },
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Update the seller's payment summary
    await SellerPaymentSummary.findOneAndUpdate(
      { seller_id: payment.seller_id },
      {
        $inc: {
          total_paid: payment.net_amount,
          outstanding_amount: -payment.net_amount
        },
        $set: {
          last_payout_date: new Date(),
          last_payout_amount: payment.net_amount,
          next_payout_amount: 0 // Reset next payout amount
        }
      }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment_id: payment._id,
        status: payment.payout_status,
        transaction_id: payment.transaction_id,
        amount: payment.net_amount
      }
    });
    
  } catch (error) {
    console.error('Error in processSellerPayment:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing payment',
      error: error.message
    });
  }
};

/**
 * Generate initial payment history for all past orders
 * This is a utility function to populate payment history for existing orders
 */
export const generateInitialPaymentHistory = async (req, res) => {
  try {
    // Get the seller ID from the authenticated user
    const sellerId = req.user && req.user._id;
    
    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: 'Seller ID is required'
      });
    }

    console.log(`Generating initial payment history for seller: ${sellerId}`);
    
    // Step 1: Find all OrderProduct records for this seller - this is the correct way 
    // to find orders associated with a seller since sellerId is in the OrderProduct model
    const orderProducts = await OrderProduct.find({
      sellerId: sellerId
    }).populate('productId');
    
    console.log(`Found ${orderProducts.length} order products for this seller`);
    
    // Step 2: Get already processed order product IDs
    const processedPayments = await SellerPayment.find({ seller_id: sellerId });
    const processedOrderProductIds = new Set();
    
    processedPayments.forEach(payment => {
      payment.orders.forEach(order => {
        if (order.order_product_id) {
          processedOrderProductIds.add(order.order_product_id.toString());
        }
      });
    });
    
    console.log(`Found ${processedOrderProductIds.size} already processed order products`);
    
    // Step 3: Find the corresponding orders for each order product
    // and group them by week for payment processing
    const ordersByWeek = {};
    
    for (const orderProduct of orderProducts) {
      // Skip if already processed
      if (processedOrderProductIds.has(orderProduct._id.toString())) {
        console.log(`Skipping already processed order product: ${orderProduct._id}`);
        continue;
      }
      
      try {
        // Find the order that references this order product
        const order = await Order.findOne({ orderProduct: orderProduct._id });
        
        if (!order) {
          console.log(`Could not find order for orderProduct: ${orderProduct._id}`);
          continue;
        }
        
        // We include delivered, shipped, and returned orders
        if (order.status !== 'delivered' && order.status !== 'shipped' && order.status !== 'returned') {
          console.log(`Skipping order with status: ${order.status}`);
          continue;
        }
        
        // Get the week of the order (for weekly payment batching)
        const orderDate = order.updatedAt || order.createdAt;
        const weekStart = new Date(orderDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().slice(0, 10);
        
        if (!ordersByWeek[weekKey]) {
          ordersByWeek[weekKey] = {
            deliveredOrShippedOrders: [],
            returnedOrders: [],
            paymentDate: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) // One week after the week start
          };
        }
        
        // Store the order with its corresponding order product
        if (order.status === 'delivered' || order.status === 'shipped') {
          ordersByWeek[weekKey].deliveredOrShippedOrders.push({
            order,
            orderProduct
          });
        } else if (order.status === 'returned') {
          ordersByWeek[weekKey].returnedOrders.push({
            order,
            orderProduct
          });
        }
      } catch (error) {
        console.error(`Error processing orderProduct ${orderProduct._id}:`, error);
      }
    }
    
    console.log(`Grouped orders into ${Object.keys(ordersByWeek).length} weekly batches`);
    
    // Step 4: Process each week's orders
    const createdPayments = [];
    
    for (const [weekKey, weekData] of Object.entries(ordersByWeek)) {
      try {
        const { deliveredOrShippedOrders, returnedOrders, paymentDate } = weekData;
        
        // Calculate payment details
        let totalOrderAmount = 0;
        let totalReturnShippingCharges = 0;
        let totalShippingCharges = 0;
        const orderDetails = [];
        const returnShippingDetails = []; // New array to track return shipping charges
        
        // Process delivered and shipped orders
        for (const { order, orderProduct } of deliveredOrShippedOrders) {
          const amount = orderProduct.total || 0;
          totalOrderAmount += amount;
          
          // Add shipping charges
          const shippingCharge = orderProduct.shipping || 0;
          totalShippingCharges += shippingCharge;
          
          orderDetails.push({
            order_id: order._id,
            product_id: orderProduct.productId,
            order_product_id: orderProduct._id,
            amount: amount,
            status: order.status,
            delivery_date: order.updatedAt || order.createdAt,
            is_return: false,
            shipping_charge: shippingCharge
          });
        }
        
        // Process returned orders
        for (const { order, orderProduct } of returnedOrders) {
          const returnShippingCharge = 30; // Fixed charge per your requirement
          totalReturnShippingCharges += returnShippingCharge;
          
          // Add the refund entry
          orderDetails.push({
            order_id: order._id,
            product_id: orderProduct.productId,
            order_product_id: orderProduct._id,
            amount: -(orderProduct.total || 0), // Negative to indicate refund
            status: order.status,
            delivery_date: order.createdAt,
            is_return: true,
            return_date: order.updatedAt || order.createdAt,
            return_shipping_charge: 0, // Set to 0 as we'll record it separately
            shipping_charge: 0 // No shipping charge for returns
          });
          
          // Add a separate entry for the return shipping charge
          returnShippingDetails.push({
            order_id: order._id,
            product_id: orderProduct.productId,
            order_product_id: orderProduct._id,
            amount: -returnShippingCharge, // Negative to indicate deduction
            status: 'return_shipping_charge',
            description: `Return shipping charge for order ${order.order_number || order._id}`,
            return_date: order.updatedAt || order.createdAt,
            return_shipping_charge: returnShippingCharge,
            shipping_charge: 0 // No shipping charge for this entry
          });
        }
        
        // Combine regular orders and return shipping charges
        const allOrderDetails = [...orderDetails, ...returnShippingDetails];
        
        // Calculate net amount
        const netAmount = totalOrderAmount + totalShippingCharges - totalReturnShippingCharges;
        
        // Only create payment record if there are orders
        if (allOrderDetails.length > 0) {
          const payment = await SellerPayment.create({
            seller_id: sellerId,
            payment_date: paymentDate,
            payout_status: 'pending',
            order_amount: totalOrderAmount,
            shipping_charges: totalShippingCharges,
            return_shipping_charges: totalReturnShippingCharges,
            net_amount: netAmount,
            orders: allOrderDetails // Include both regular orders and shipping charges
          });
          
          createdPayments.push({
            payment_id: payment._id,
            week: weekKey,
            order_count: orderDetails.length,
            return_count: returnShippingDetails.length,
            order_amount: totalOrderAmount,
            shipping_charges: totalShippingCharges,
            return_shipping_charges: totalReturnShippingCharges,
            net_amount: netAmount
          });
        }
      } catch (error) {
        console.error(`Error processing week ${weekKey}:`, error);
      }
    }
    
    // Step 5: Update the seller payment summary
    if (createdPayments.length > 0) {
      // Calculate total outstanding amount
      const totalOutstanding = createdPayments.reduce((sum, p) => sum + p.net_amount, 0);
      
      // Find the latest payment date
      const latestPayment = createdPayments.sort((a, b) => {
        return new Date(b.week) - new Date(a.week);
      })[0];
      
      // Update the summary
      await SellerPaymentSummary.findOneAndUpdate(
        { seller_id: sellerId },
        {
          $inc: {
            outstanding_amount: totalOutstanding
          },
          $set: {
            next_payout_date: new Date(), // Today
            next_payout_amount: totalOutstanding,
            last_payout_date: null,
            last_payout_amount: 0
          }
        },
        { new: true, upsert: true }
      );
    }
    
    return res.status(200).json({
      success: true,
      message: `Generated ${createdPayments.length} payment records`,
      data: {
        created_payments: createdPayments,
        total_orders_processed: createdPayments.reduce((sum, p) => sum + p.order_count, 0),
        total_returns_processed: createdPayments.reduce((sum, p) => sum + p.return_count, 0),
        total_amount: createdPayments.reduce((sum, p) => sum + p.order_amount, 0),
        total_shipping_charges: createdPayments.reduce((sum, p) => sum + p.shipping_charges, 0),
        total_return_shipping_charges: createdPayments.reduce((sum, p) => sum + p.return_shipping_charges, 0),
        total_net_amount: createdPayments.reduce((sum, p) => sum + p.net_amount, 0)
      }
    });
    
  } catch (error) {
    console.error('Error in generateInitialPaymentHistory:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while generating payment history',
      error: error.message
    });
  }
};
