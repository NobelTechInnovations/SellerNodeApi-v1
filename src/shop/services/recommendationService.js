import BaseService from './baseService.js';
import Order from '../../models/orders/order.js';
import OrderProduct from '../../models/orders/orderProduct.js';
import UserEvent from '../../models/events/userEvent.js';
import Product from '../../models/products/product.js';
import Category from '../../models/products/category.js';
import categoryService from './categoryService.js';
import behaviorProfileService from './behaviorProfileService.js';

const RAIL_LIMIT = 10;

class RecommendationService extends BaseService {
    /**
     * Single context-aware entry point. Every placement in the app (home,
     * category, pdp, cart, search) calls this with a `context` and the
     * relevant current-page identifiers — keeps the ranking logic in one
     * place instead of duplicated per page.
     */
    async getRecommendations({ context, categoryId, productId, searchQuery, cartProductIds, lat, lng, customerId, anonId }) {
        return await this.handleDBOperation(async () => {
            switch (context) {
                case 'home':
                    return this._homeRecommendations({ lat, lng, customerId, anonId });
                case 'category':
                    return this._categoryRecommendations({ categoryId, lat, lng, customerId, anonId });
                case 'pdp':
                    return this._pdpRecommendations({ productId, lat, lng });
                case 'cart':
                    return this._cartRecommendations({ cartProductIds, lat, lng });
                case 'search':
                    return this._searchRecommendations({ searchQuery, lat, lng, customerId, anonId });
                default:
                    throw new Error(`Unknown recommendation context: ${context}`);
            }
        });
    }

    /**
     * Products bought together with productId in the same checkout — a
     * checkout can span sibling Orders (one per seller, see Phase 1), all
     * sharing order_group_id, so "same order" for FBT purposes means "same
     * order_group_id", not just "same Order._id".
     */
    async _frequentlyBoughtWith(productId, excludeId) {
        const ownLines = await OrderProduct.find({ productId }, { order_id: 1 }).lean();
        if (ownLines.length === 0) return [];

        const ownOrders = await Order.find({ _id: { $in: ownLines.map((l) => l.order_id) } }, { order_group_id: 1 }).lean();
        const groupIds = [...new Set(ownOrders.map((o) => o.order_group_id).filter(Boolean))];
        if (groupIds.length === 0) return [];

        const siblingOrders = await Order.find({ order_group_id: { $in: groupIds } }, { _id: 1 }).lean();
        const siblingOrderIds = siblingOrders.map((o) => o._id);

        const rows = await OrderProduct.aggregate([
            { $match: { order_id: { $in: siblingOrderIds }, productId: { $ne: excludeId } } },
            { $group: { _id: '$productId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: RAIL_LIMIT },
        ]);
        return rows.map((r) => r._id);
    }

    /**
     * Products viewed in the same browsing session as productId — "customers
     * who looked at this also looked at" without needing a purchase to have
     * happened. Relies on session_id (Phase 4, M1) being populated by the
     * frontend; sessions from before that change simply won't contribute.
     */
    async _coViewedWith(productId, excludeId) {
        const sessionIds = await UserEvent.distinct('session_id', {
            event_type: 'view_product', product_id: productId, session_id: { $ne: null },
        });
        if (sessionIds.length === 0) return [];

        const rows = await UserEvent.aggregate([
            // $nin instead of two $ne keys on the same field — duplicate
            // object keys collapse in JS (last wins), so the excludeId
            // filter was silently dropped before. $nin covers both in one.
            { $match: { event_type: 'view_product', session_id: { $in: sessionIds }, product_id: { $nin: [excludeId, null] } } },
            { $group: { _id: '$product_id', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: RAIL_LIMIT },
        ]);
        return rows.map((r) => r._id);
    }

    /** Most purchased products in the last 7 days — the "trending" backfill pool. */
    async _trendingProductIds(excludeIds = [], limitN = RAIL_LIMIT) {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const rows = await UserEvent.aggregate([
            { $match: { event_type: 'purchase', created_at: { $gte: since }, product_id: { $ne: null, $nin: excludeIds } } },
            { $group: { _id: '$product_id', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limitN },
        ]);
        return rows.map((r) => r._id);
    }

    async _pdpRecommendations({ productId, lat, lng }) {
        if (!productId) return { rails: [] };

        const prod = await Product.findOne({ product_id: productId }, { category_id: 1 }).lean();
        const rails = [];

        if (prod?.category_id) {
            const categoryIds = await categoryService.getAllChildCategoryIds(prod.category_id);
            const { flattenedProducts } = await categoryService._queryFilteredProducts({
                categoryIds, lat, lng, limit: RAIL_LIMIT + 1,
            });
            const similar = flattenedProducts.filter((p) => p.product_id !== productId).slice(0, RAIL_LIMIT);
            if (similar.length > 0) {
                rails.push({ title: 'Similar Products', placement: 'pdp_similar', based_on: 'category_affinity', products: similar });
            }
        }

        const fbtIds = await this._frequentlyBoughtWith(productId, productId);
        if (fbtIds.length > 0) {
            const fbt = await categoryService.hydrateProductsByIds(fbtIds, { lat, lng });
            if (fbt.length > 0) rails.push({ title: 'Frequently Bought Together', placement: 'pdp_fbt', based_on: 'co_purchase', products: fbt });
        }

        const coViewIds = await this._coViewedWith(productId, productId);
        if (coViewIds.length > 0) {
            const coViewed = await categoryService.hydrateProductsByIds(coViewIds, { lat, lng });
            if (coViewed.length > 0) rails.push({ title: 'Customers Also Explored', placement: 'pdp_also_explored', based_on: 'co_view', products: coViewed });
        }

        return { rails };
    }

    async _cartRecommendations({ cartProductIds, lat, lng }) {
        if (!cartProductIds || cartProductIds.length === 0) return { rails: [] };

        const fbtSets = await Promise.all(cartProductIds.map((id) => this._frequentlyBoughtWith(id, id)));
        const seen = new Set(cartProductIds);
        const merged = [];
        for (const set of fbtSets) {
            for (const id of set) {
                if (!seen.has(id)) { seen.add(id); merged.push(id); }
            }
        }
        const fbtIds = merged.slice(0, RAIL_LIMIT);
        const rails = [];
        if (fbtIds.length > 0) {
            const fbt = await categoryService.hydrateProductsByIds(fbtIds, { lat, lng });
            if (fbt.length > 0) rails.push({ title: 'Frequently Bought Together', placement: 'cart', based_on: 'co_purchase', products: fbt });
        }
        return { rails };
    }

    async _homeRecommendations({ lat, lng, customerId, anonId }) {
        const profile = await behaviorProfileService.getUserAffinityProfile({ customerId, anonId });
        const rails = [];

        // Only add a genuinely personalized product-affinity rail once
        // there's real signal — a cold profile has no productAffinity to
        // show, so this rail simply doesn't render rather than guessing.
        if (profile.productAffinity.length > 0) {
            const ids = profile.productAffinity.map((p) => p.product_id);
            const products = await categoryService.hydrateProductsByIds(ids, { lat, lng });
            if (products.length > 0) {
                rails.push({ title: 'Recommended for You', placement: 'homepage', based_on: 'category_affinity', products });
            }
        }

        const trendingIds = await this._trendingProductIds(profile.productAffinity.map((p) => p.product_id));
        if (trendingIds.length > 0) {
            const trending = await categoryService.hydrateProductsByIds(trendingIds, { lat, lng });
            if (trending.length > 0) rails.push({ title: 'Trending Now', placement: 'homepage', based_on: 'trending', products: trending });
        }

        return { rails, confidence: profile.confidence };
    }

    async _categoryRecommendations({ categoryId, lat, lng, customerId, anonId }) {
        if (!categoryId) return { rails: [] };
        const category = await Category.findById(categoryId).lean();
        if (!category) return { rails: [] };

        const categoryIds = await categoryService.getAllChildCategoryIds(categoryId);
        const { flattenedProducts } = await categoryService._queryFilteredProducts({ categoryIds, lat, lng, limit: RAIL_LIMIT });
        const rails = [];
        if (flattenedProducts.length > 0) {
            rails.push({ title: `Popular in ${category.name}`, placement: 'category', based_on: 'trending', products: flattenedProducts });
        }
        return { rails };
    }

    async _searchRecommendations({ searchQuery, lat, lng }) {
        // Trending backfill shown alongside/below search results — full
        // relevance-ranked search results themselves come from the
        // dedicated search endpoint (Phase 4, M4), not from here.
        const trendingIds = await this._trendingProductIds([]);
        const rails = [];
        if (trendingIds.length > 0) {
            const trending = await categoryService.hydrateProductsByIds(trendingIds, { lat, lng });
            if (trending.length > 0) rails.push({ title: 'Trending Now', placement: 'search', based_on: 'trending', products: trending });
        }
        return { rails };
    }
}

export default new RecommendationService();
