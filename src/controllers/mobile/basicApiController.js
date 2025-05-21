// src/controllers/mobile/basicApiController.js

import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import ServiceableZone from '../../models/admin/ServiceableZone.js';
import SellerCategory from '../../models/products/sellerCategory.js';
import Category from '../../models/products/category.js';
import User from '../../models/users/user.js';


import mongoose from 'mongoose';

export const getServiceableZone = async (req, res) => {
  try {
    const { long, lat } = req.query;

    if (!long || !lat) {
      return sendError(res, 'Longitude and latitude are required');
    }

    const longitude = parseFloat(long);
    const latitude = parseFloat(lat);

    const serviceableZones = await ServiceableZone.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          distanceField: "distance", // Will contain distance in meters
          spherical: true,
          maxDistance: 5000, // 5km
          query: {
            sent_to_mobile_app: false
          }
        }
      },
      {
        $sort: { distance: 1 } // Optional: sort by nearest first
      }
    ]);

    if (!serviceableZones || serviceableZones.length === 0) {
      return sendSuccess(res, 'No serviceable zone found', []);
    }

    // groupby categoryidd

  

    const sellerIds = serviceableZones.map(zone => zone.seller_id);
    const sellerCategories = await SellerCategory.find({ seller_id: { $in: sellerIds } });
    const categoryIds = [...new Set(sellerCategories.map(sc => sc.category_id.toString()))];
    const categories = await Category.find({ _id: { $in: categoryIds } });
    const categoryMap = {};
    for (let cat of categories) {
      const parent = cat.parent ? await Category.findById(cat.parent) : null;
      categoryMap[cat._id] = {
        categoryName: cat.name,
        parentCategoryName: parent ? parent.name : null,
        parentCategoryId: parent ? parent._id : null
      };
    }
    const sellerCategoryDetails = sellerCategories.map(sc => {
      const catInfo = categoryMap[sc.category_id.toString()];
      return {
        seller_id: sc.seller_id,
        category_id: sc.category_id,
        category: catInfo?.categoryName,
        parentCategory: catInfo?.parentCategoryName,
        parentCategoryId: catInfo?.parentCategoryId
      };
    });

    

    return sendSuccess(res, 'Serviceable zones fetched successfully', sellerCategoryDetails);

  } catch (error) {
    console.error(error);
    return sendError(res, error.message || 'Something went wrong');
  }
};

// export const getServiceableZone = async (req, res) => {
//     try {
//       const { long, lat } = req.query;
  
//       if (!long || !lat) {
//         return sendError(res, 'Longitude and latitude are required');
//       }
  
//       const serviceableZones = await ServiceableZone.find({
//         sent_to_mobile_app: false,
//         location: {
//           $near: {
//             $geometry: {
//               type: "Point",
//               coordinates: [parseFloat(long), parseFloat(lat)]
//             },
//             $maxDistance: 5000 // meters
//           }
//         }
//       });
      
//       if (!serviceableZones) {
//         return sendSuccess(res, 'No serviceable zone found', []);
//       }
//       return sendSuccess(res, 'Serviceable zone fetched successfully', serviceableZones);
//       // Step 2: Find all sellers in that zone
//       const sellerIds = serviceableZone.seller_id; // assuming an array of seller_ids is stored in the serviceable zone
//       if (!sellerIds || sellerIds.length === 0) {
//         return sendSuccess(res, 'No sellers found in this zone', []);
//       }
  
//       // Step 3: Get seller categories
//       const sellerCategories = await SellerCategory.find({
//         seller_id: { $in: sellerIds },
//         is_deleted: false
//       });
  
//       // Step 4: Get unique category IDs
//       const categoryIds = [...new Set(sellerCategories.map(sc => sc.category_id.toString()))];
  
//       // Step 5: Fetch categories with parent info
//       const categories = await Category.find({ _id: { $in: categoryIds } });
  
//       // Step 6: Build response with category and parent category names
//       const categoryMap = {};
//       for (let cat of categories) {
//         const parent = cat.parent ? await Category.findById(cat.parent) : null;
//         categoryMap[cat._id] = {
//           categoryName: cat.name,
//           parentCategoryName: parent ? parent.name : null,
//           parentCategoryId: parent ? parent._id : null
//         };
//       }
  
//       // Step 7: Merge back into sellerCategory data
//       const sellerCategoryDetails = sellerCategories.map(sc => {
//         const catInfo = categoryMap[sc.category_id.toString()];
//         return {
//           seller_id: sc.seller_id,
//           category_id: sc.category_id,
//           category: catInfo?.categoryName,
//           parentCategory: catInfo?.parentCategoryName,
//           parentCategoryId: catInfo?.parentCategoryId
//         };
//       });
  
//       return sendSuccess(res, 'Serviceable zone data fetched successfully', sellerCategoryDetails);
  
//     } catch (error) {
//       console.error(error);
//       return sendError(res, error.message || 'Something went wrong');
//     }
//   };
  