import BaseService from './baseService.js';
import Wishlist from '../models/wishlist/Wishlist.js';
import { AppError } from '../utils/index.js';

class WishlistService extends BaseService {

    /**
     * Add if not present, remove if present — the single action a heart
     * icon needs. Returns { wishlisted: boolean } so the frontend can
     * flip its local state without a second round-trip.
     */
    async toggleWishlist(customer, payload) {
        return await this.handleDBOperation(async () => {
            const { productId, sku, type, title, images, price, sellerName } = payload;

            if (!productId) {
                throw new AppError('productId is required', 400);
            }

            const existing = await Wishlist.findOne({
                customerId: customer._id,
                productId
            });

            if (existing) {
                await Wishlist.deleteOne({ _id: existing._id });
                return { wishlisted: false };
            }

            await Wishlist.create({
                customerId: customer._id,
                productId,
                sku: sku || null,
                type: type || 'simple',
                productDetails: {
                    title: title || '',
                    image: Array.isArray(images) ? images[0] : (images || ''),
                    price: price != null ? Number(price) : null,
                    sellerName: sellerName || null
                }
            });
            return { wishlisted: true };
        });
    }

    async getWishlist(customer) {
        return await this.handleDBOperation(async () => {
            const items = await Wishlist.find({ customerId: customer._id }).sort({ createdAt: -1 });
            return items;
        });
    }

    async isWishlisted(customer, productId) {
        return await this.handleDBOperation(async () => {
            const existing = await Wishlist.findOne({ customerId: customer._id, productId });
            return { wishlisted: !!existing };
        });
    }
}

export default new WishlistService();
