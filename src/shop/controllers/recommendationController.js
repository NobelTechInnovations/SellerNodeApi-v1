import { catchAsync } from '../utils/index.js';
import BaseController from './baseController.js';
import recommendationService from '../services/recommendationService.js';

class RecommendationController extends BaseController {
    constructor() {
        super();
    }

    // GET /gz/recommendations?context=home|category|search|pdp|cart
    //   &categoryId=&productId=&searchQuery=&cartProductIds=&lat=&lng=&anonId=
    getRecommendations = catchAsync(async (req, res) => {
        const { context, categoryId, productId, searchQuery, cartProductIds, lat, lng, anonId } = req.query;

        const result = await recommendationService.getRecommendations({
            context,
            categoryId,
            productId,
            searchQuery,
            cartProductIds: cartProductIds ? String(cartProductIds).split(',').map((s) => s.trim()).filter(Boolean) : [],
            lat,
            lng,
            customerId: req.customer?._id?.toString() || null,
            anonId: anonId || null,
        });

        return this.sendResponse(res, result, 'Recommendations fetched');
    });
}

export default new RecommendationController();
