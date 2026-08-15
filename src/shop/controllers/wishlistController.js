import BaseController from './baseController.js';
import wishlistService from '../services/wishlistService.js';
import { catchAsync } from '../utils/index.js';

class WishlistController extends BaseController {
    toggle = catchAsync(async (req, res) => {
        const result = await wishlistService.toggleWishlist(req.customer, req.body);
        return this.sendResponse(res, result, result.wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    });

    list = catchAsync(async (req, res) => {
        const items = await wishlistService.getWishlist(req.customer);
        return this.sendResponse(res, items, 'Wishlist retrieved successfully');
    });

    check = catchAsync(async (req, res) => {
        const { productId } = req.params;
        const result = await wishlistService.isWishlisted(req.customer, productId);
        return this.sendResponse(res, result, 'Wishlist status retrieved');
    });
}

export default new WishlistController();
