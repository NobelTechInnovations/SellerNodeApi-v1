import User from '../../models/users/user.js';
import SellerBankDetails from '../../models/users/sellerBankDetails.js';
import SellerBusinessDetails from '../../models/users/sellerBusinessDetails.js';
import SellerWarehouse from '../../models/users/sellerWarehouse.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import mongoose from 'mongoose';
import ProductSellerSku from '../../models/products/productSellerSku.js';

/**
 * Get list of all sellers who are onboarded in User model
 * @route GET /api/admin/sellers
 * @access Admin
 */
export const getAllSellers = async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 50 } = req.query;
    
    // Build query based on filters
    const query = { deleted_at: null };
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const totalCount = await User.countDocuments(query);
    
    // Get sellers with pagination and sorting
    const sellers = await User.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('name email phone status profile_complete createdAt updatedAt');

    // Get business details for all sellers
    const sellerIds = sellers.map(seller => seller._id);
    const businessDetails = await SellerBusinessDetails.find({
      seller_id: { $in: sellerIds }
    }).select('seller_id business_address pincode location');

    // Create a map of business details by seller ID for easy lookup
    const businessDetailsMap = businessDetails.reduce((map, detail) => {
      map[detail.seller_id.toString()] = detail;
      return map;
    }, {});

    // Combine seller data with their business details
    const sellersWithAddress = sellers.map(seller => {
      const sellerObj = seller.toObject();
      const businessDetail = businessDetailsMap[seller._id.toString()] || {};
      
      return {
        ...sellerObj,
        business_address: businessDetail.business_address || null,
        pincode: businessDetail.pincode || null,
        location: businessDetail.location || null
      };
    });
    
    // Prepare pagination info
    const pagination = {
      total: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / parseInt(limit))
    };
    
    return sendSuccess(res, 'Sellers retrieved successfully', { sellers: sellersWithAddress, pagination });
  } catch (error) {
    return sendError(res, error.message, {}, 500);
  }
};

/**
 * Get detailed information about a specific seller
 * @route GET /api/admin/sellers/:id
 * @access Admin
 */
export const getSellerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid seller ID', {}, 400);
    }
    
    // Get basic seller information
    const seller = await User.findOne({ 
      _id: id, 
      deleted_at: null 
    }).select('-password');
    
    if (!seller) {
      return sendError(res, 'Seller not found', {}, 404);
    }
    
    // Get seller's business details
    const businessDetails = await SellerBusinessDetails.findOne({ 
      seller_id: id 
    });
    
    // Get seller's bank details
    const bankDetails = await SellerBankDetails.find({ 
      seller_id: id,
      deleted_at: null
    });
    
    // Get seller's warehouses
    const warehouses = await SellerWarehouse.find({ 
      seller_id: id,
      deleted_at: null 
    });
    
    return sendSuccess(res, 'Seller details retrieved successfully', {
      seller,
      businessDetails,
      bankDetails,
      warehouses
    });
  } catch (error) {
    return sendError(res, error.message, {}, 500);
  }
};

/**
 *  Approve seller
 * @route GET /api/admin/sellers/:id/approve
 * @access Admin
 */
export const approveSeller = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid seller ID', {}, 400);
    }

    const seller = await User.findById(id);
    if (!seller) {
      return sendError(res, 'Seller not found', {}, 404);
    }
    
    seller.status = 'active';
    await seller.save();

    return sendSuccess(res, 'Seller approved successfully', {});
  } catch (error) {
    return sendError(res, error.message, {}, 500);
  }
};

/**
 *  Reject seller
 * @route GET /api/admin/sellers/:id/reject
 * @access Admin
 */
export const rejectSeller = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid seller ID', {}, 400);
    }

    const seller = await User.findById(id);
    if (!seller) {
      return sendError(res, 'Seller not found', {}, 404);
    }
    
    seller.status = 'rejected';
    await seller.save();

    return sendSuccess(res, 'Seller approved successfully', {});
  } catch (error) {
    return sendError(res, error.message, {}, 500);
  }
};

/**
 *  Reject seller
 * @route GET /api/admin/sellers/:id/reject
 * @access Admin
 */
export const suspendSeller = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid seller ID', {}, 400);
    }

    const seller = await User.findById(id);
    if (!seller) {
      return sendError(res, 'Seller not found', {}, 404);
    }
    
    seller.status = 'suspended';
    await seller.save();

    return sendSuccess(res, 'Seller approved successfully', {});
  } catch (error) {
    return sendError(res, error.message, {}, 500);
  }
};

/**
 * Get seller products
 * @route GET /api/admin/sellers/:id/products
 * @access Admin
 */
export const getSellerProducts = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid seller ID', {}, 400);
    }
  
    const products = await ProductSellerSku.find({
      seller_id: id,
      deleted_at: null
    }).select('name price quantity status');
    
    return sendSuccess(res, 'Seller products retrieved successfully', { products });
  } catch (error) {
    return sendError(res, error.message, {}, 500);
  }
};


/**
 * Index seller onboarding system and get user flow information
 * @route GET /api/admin/sellers/onboarding/index
 * @access Admin
 */
export const indexSellerOnboarding = async (req, res) => {
  try {
    // Get count of sellers at each stage of onboarding
    const onboardingStats = await User.aggregate([
      { $match: { deleted_at: null } },
      { 
        $group: {
          _id: { 
            status: "$status", 
            profile_complete: "$profile_complete" 
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          status: "$_id.status",
          profile_complete: "$_id.profile_complete",
          count: 1
        }
      }
    ]);
    
    // Get total seller count by status
    const statusCounts = await User.aggregate([
      { $match: { deleted_at: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } }
    ]);
    
    // Get sellers who registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRegistrations = await User.aggregate([
      { 
        $match: { 
          createdAt: { $gte: thirtyDaysAgo },
          deleted_at: null
        } 
      },
      { 
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } }
    ]);
    
    // Define onboarding flow steps for documentation
    const onboardingFlow = [
      {
        step: 1,
        name: "Registration",
        description: "Seller provides basic details like name, email, phone and password",
        status: "pending",
        profile_complete: false
      },
      {
        step: 2,
        name: "Business Details",
        description: "Seller completes business information and uploads required documents",
        status: "in-review",
        profile_complete: false
      },
      {
        step: 3,
        name: "Bank Details",
        description: "Seller adds bank account information for payments",
        status: "in-review",
        profile_complete: false
      },
      {
        step: 4,
        name: "Warehouse Setup",
        description: "Seller adds warehouse and shipping information",
        status: "in-review", 
        profile_complete: false
      },
      {
        step: 5,
        name: "Verification",
        description: "Admin reviews and verifies seller information",
        status: "in-review",
        profile_complete: true
      },
      {
        step: 6,
        name: "Activated",
        description: "Seller is approved and account is active",
        status: "active",
        profile_complete: true
      }
    ];
    
    return sendSuccess(res, 'Seller onboarding index retrieved successfully', {
      onboardingStats,
      statusCounts,
      recentRegistrations,
      onboardingFlow
    });
  } catch (error) {
    return sendError(res, error.message, {}, 500);
  }
};
