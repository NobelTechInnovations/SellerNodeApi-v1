import { catchAsync } from '../utils/index.js';
import BaseController from './baseController.js';
import homeFeedService from '../services/homeFeedService.js';

class HomeFeedController extends BaseController {
    constructor() {
        super();
    }

    getFeed = catchAsync(async (req, res) => {
        const { lat, lng, anonId } = req.query;
        const result = await homeFeedService.getHomeFeed({
            customerId: req.customer?._id?.toString() || null,
            anonId: anonId || null,
            lat,
            lng,
        });
        return this.sendResponse(res, result, 'Home feed fetched');
    });
}

export default new HomeFeedController();
