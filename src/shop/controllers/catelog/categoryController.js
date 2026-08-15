import { catchAsync } from '../../utils/index.js';
import  BaseController  from '../baseController.js';
import categoryService from '../../services/categoryService.js';
import searchService from '../../services/searchService.js';
import eventService from '../../services/eventService.js';

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

    // GET /gz/catalog/search?q=... — backend-owned, fully-tracked search
    // (Phase 4, M4). Every call logs a `search` UserEvent with the exact
    // result set + positions shown, which is the actual "impression" record
    // search-intelligence reporting (keyword volume, CTR, no-result
    // keywords) reads from later — no separate impression write needed.
    searchProducts = catchAsync(async (req, res) => {
        const result = await searchService.searchProducts(req.query);

        const anonId = req.query.anonId || null;
        const customerId = req.customer?._id?.toString() || null;
        if (customerId || anonId) {
            eventService.trackEvent({
                customerId,
                anonId,
                eventType: 'search',
                searchQuery: result.query,
                source: 'search',
                productIds: result.products.map((p) => p.product_id),
                positions: result.products.map((_, i) => i + 1),
            }).catch(() => {}); // best-effort, never block the search response
        }

        return this.sendResponse(res, result, 'Search results fetched');
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