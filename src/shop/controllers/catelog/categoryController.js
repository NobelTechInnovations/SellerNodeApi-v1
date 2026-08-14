import { catchAsync } from '../../utils/index.js';
import  BaseController  from '../baseController.js';
import categoryService from '../../services/categoryService.js';

class CategoryController extends BaseController {
    constructor() {
        super();
    }

    categoryListing = catchAsync(async (req, res) => {
        const limit = parseInt(req.query.limit) || 8;  // Default limit to 8 if not provided
        const result = await categoryService.categoryListing(req.query, limit);
        return this.sendResponse(res, result, 'Category listing fetched');
    });


    categoryItems = catchAsync(async (req, res) => {
        const result = await categoryService.categoryItems(req.params.categoryId, req.query);
        return this.sendResponse(res, result, 'Category items fetched');
    });

    // Unscoped listing (no mandatory category) — same lat/lng + price/brand
    // filters as categoryItems, plus an optional `category` query param.
    nearbyProducts = catchAsync(async (req, res) => {
        const result = await categoryService.nearbyProducts(req.query);
        return this.sendResponse(res, result, 'Nearby products fetched');
    });

    // router.get('/:categoryId/item/:itemId', categoryController.categoryRecommendedProducts);
    categoryRecommendedProducts = catchAsync(async (req, res) => {
        const { categoryId, itemId } = req.params; // Get categoryId and itemId from URL params

        // Call a service function to get recommended products
        const recommendedProducts = await categoryService.getRecommendedProducts(categoryId, itemId);

        // Return the recommended products
        return this.sendResponse(res, recommendedProducts, 'Recommended products fetched');
    })
    
}

export default new CategoryController();