import Order from '../models/orders/order.js';
import OrderProduct from '../models/orders/orderProduct.js';
import mongoose from 'mongoose';
import Product from '../models/products/product.js';
import ProductDescription from '../models/products/productDescription.js';
import ProductImage from '../models/products/productImage.js';


// Get return statistics for a seller
export const getReturnStatistics = async (req, res) => {
    try {
      const sellerId = req.user._id;
  
      // Get date range from query params or use default (last 30 days)
      const endDate = new Date();
      const startDate = req.query.startDate
        ? new Date(req.query.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  
      // Step 1: Fetch all order products for this seller and populate related product data
      const orderProducts = await OrderProduct.find({ sellerId })
        .populate({
          path: 'productId',
          populate: [
            {
              path: 'descriptions',
              match: { language: 'en' },
              select: 'title description'
            },
            {
              path: 'images',
              select: 'thumbnail_image gallery_images'
            }
          ]
        });
  
      if (!orderProducts || orderProducts.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            summary: {
              totalShipped: 0,
              totalDelivered: 0,
              totalReturned: 0,
              totalRTO: 0,
              totalOrders: 0,
              returnRate: 0,
              rtoRate: 0
            },
            productPerformance: []
          }
        });
      }
  
      const productMap = new Map();
      const orderProductToProductMap = {};
  
      // Step 2: Initialize product statistics
      for (const op of orderProducts) {
        const product = op.productId;
        if (!product) continue;
  
        const productId = product._id.toString();
        orderProductToProductMap[op._id.toString()] = productId;
  
        if (!productMap.has(productId)) {
          const description = product?.descriptions?.[0];
          const imageData = product?.images?.[0];
  
          productMap.set(productId, {
            productId: product._id,
            agora_product_id: product.product_id,
            name: description?.title || product.unified_sku || 'Unknown Product',
            image: imageData?.thumbnail_image || imageData?.gallery_images?.[0] || null,
            category: product.category_id,
            sku: product.unified_sku || op.sku || 'N/A',
            totalOrders: 0,
            totalShipped: 0,
            totalDelivered: 0,
            totalReturned: 0,
            returnsAfterDelivery: 0,
            returnRate: 0
          });
        }
      }
  
      // Step 3: Get all related orders
      const orderIds = orderProducts.map(op => op._id);
      const orders = await Order.find({ orderProduct: { $in: orderIds } });
  
      // Create a set of unique order numbers to avoid counting duplicates
      const uniqueOrderNumbers = new Set();
      
      // Track order history
      const orderHistory = {};
  
      // Step 4: Analyze orders and update statistics
      for (const order of orders) {
        if (!order.orderProduct) continue;
  
        const orderProductId = order.orderProduct.toString();
        const productId = orderProductToProductMap[orderProductId];
        if (!productId || !productMap.has(productId)) continue;
  
        // Add to unique order numbers set
        uniqueOrderNumbers.add(order.order_number);
        
        const stats = productMap.get(productId);
        stats.totalOrders += 1;
  
        if (order.status === 'shipped') {
          stats.totalShipped += 1;
        } else if (order.status === 'delivered') {
          stats.totalDelivered += 1;
        } else if (['return_requested', 'return_in_process', 'returned'].includes(order.status)) {
          stats.totalReturned += 1;
        }
  
        if (!orderHistory[order.order_number]) {
          orderHistory[order.order_number] = {
            productId,
            status: order.status,
            wasDelivered: order.status === 'delivered'
          };
        }
      }
  
      // Step 5: Calculate return rates per product
      productMap.forEach((product) => {
        if (product.totalOrders > 0) {
          product.returnRate = parseFloat(((product.totalReturned / product.totalOrders) * 100).toFixed(2));
        }
      });
  
      // Step 6: Prepare product stats array sorted by return rate
      const productStats = Array.from(productMap.values())
        .filter(p => p.totalOrders > 0)
        .sort((a, b) => {
          if (b.returnRate === a.returnRate) {
            return b.totalDelivered - a.totalDelivered;
          }
          return b.returnRate - a.returnRate;
        });
  
      // Step 7: Calculate overall summary stats using unique order count
      const totalUniqueOrders = uniqueOrderNumbers.size;
      
      const totalShipped = orders.filter(order => order.status === 'shipped').length;
      const totalDelivered = orders.filter(order => order.status === 'delivered').length;
      const totalReturned = orders.filter(order => 
        ['return_requested', 'return_in_process', 'returned'].includes(order.status)
      ).length;
      const totalRTO = orders.filter(order => order.status === 'rto_return').length;
  
      const returnRate = totalUniqueOrders > 0
        ? parseFloat(((totalReturned / totalUniqueOrders) * 100).toFixed(2))
        : 0;
  
      const rtoRate = totalUniqueOrders > 0
        ? parseFloat(((totalRTO / totalUniqueOrders) * 100).toFixed(2))
        : 0;
  
      // Step 8: Respond with data
      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalShipped,
            totalDelivered,
            totalReturned,
            totalRTO,
            totalOrders: totalUniqueOrders,
            returnRate,
            rtoRate
          },
          productPerformance: productStats
        }
      });
    } catch (error) {
      console.error('Error in getReturnStatistics:', error);
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

    // Get product details
    const product = await Product.findById(productId)
      .populate([
        {
          path: 'descriptions',
          match: { language: 'en' },
          select: 'title description'
        },
        {
          path: 'images',
          select: 'thumbnail_image gallery_images'
        }
      ]);

    // Get all order IDs
    const orderIds = orderProducts.map(op => op._id);

    // Find all orders containing this product
    const orders = await Order.find({
      orderProduct: { $in: orderIds },
    }).populate({
      path: 'customer_id',
      select: 'name email phone'
    });

    // Create a set of unique order numbers
    const uniqueOrderNumbers = new Set();
    orders.forEach(order => {
      if (order.order_number) {
        uniqueOrderNumbers.add(order.order_number);
      }
    });
    
    // Total unique orders
    const totalUniqueOrders = uniqueOrderNumbers.size;

    // Separate orders by status
    const shippedOrders = orders.filter(order => order.status === 'shipped');
    const deliveredOrders = orders.filter(order => order.status === 'delivered');
    const returnedOrders = orders.filter(order => 
      ['return_requested', 'return_in_process', 'returned'].includes(order.status)
    );
    const rtoOrders = orders.filter(order => order.status === 'rto_return');

    // Calculate return rate based on total unique orders
    const returnRate = totalUniqueOrders > 0 
      ? parseFloat(((returnedOrders.length / totalUniqueOrders) * 100).toFixed(2)) 
      : 0;

    // Calculate RTO rate based on total unique orders
    const rtoRate = totalUniqueOrders > 0
      ? parseFloat(((rtoOrders.length / totalUniqueOrders) * 100).toFixed(2))
      : 0;

    const description = product?.descriptions?.[0];
    const imageData = product?.images?.[0];

    res.status(200).json({
      success: true,
      data: {
        product: {
          id: product ? product._id : productId,
          name: description?.title || (product ? product.unified_sku : 'Unknown Product'),
          description: description?.description || '',
          image: imageData?.thumbnail_image || (imageData?.gallery_images && imageData?.gallery_images.length > 0 ? imageData.gallery_images[0] : null),
          sku: product ? product.unified_sku : 'N/A'
        },
        totalShipped: shippedOrders.length,
        totalDelivered: deliveredOrders.length,
        totalReturned: returnedOrders.length,
        totalRTO: rtoOrders.length,
        totalOrders: totalUniqueOrders,
        returnRate,
        rtoRate,
        shippedOrders,
        deliveredOrders,
        returnedOrders,
        rtoOrders
      }
    });
  } catch (error) {
    console.error('Error in getProductReturnDetails:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};
