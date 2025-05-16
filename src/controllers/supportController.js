import SupportQuery from '../models/support/supportQuery.js';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Save a new support query from seller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with success/error message
 */
export const saveQuery = async (req, res) => {
  try {
    const { subject, relatedConcern, orderId, productId, message, phoneNumber } = req.body;
    const sellerId = req.user._id;

    if (!subject || !relatedConcern || !message) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(new ApiResponse(
          StatusCodes.BAD_REQUEST, 
          false, 
          'Subject, related concern and message are required fields'
        ));
    }

    const queryData = {
      sellerId,
      subject,
      relatedConcern,
      message,
      phoneNumber: phoneNumber || null
    };

    // Add optional fields if provided
    if (orderId) queryData.orderId = orderId;
    if (productId) queryData.productId = productId;

    const supportQuery = await SupportQuery.create(queryData);

    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(
        StatusCodes.CREATED, 
        true, 
        'Support query submitted successfully',
        supportQuery
      ));
  } catch (error) {
    console.error('Error saving support query:', error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR, 
        false, 
        'Failed to submit support query'
      ));
  }
};

/**
 * Get all support queries for a seller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with list of support queries
 */
export const getQueries = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Build query object
    const query = { sellerId };
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find queries with pagination
    const queries = await SupportQuery.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    // Get total count for pagination
    const total = await SupportQuery.countDocuments(query);
    
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(
        StatusCodes.OK,
        true,
        'Support queries retrieved successfully',
        {
          queries,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      ));
  } catch (error) {
    console.error('Error fetching support queries:', error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(new ApiResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        false,
        'Failed to retrieve support queries'
      ));
  }
};
