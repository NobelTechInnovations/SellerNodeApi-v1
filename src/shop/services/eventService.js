import BaseService from './baseService.js';
import UserEvent from '../../models/events/userEvent.js';
import ProductSellerSKU from '../../models/products/productSellerSku.js';

// @deprecated (Phase 4) — kept only so old imports don't break. homeFeedService
// now uses behaviorProfileService's weighted, recency-aware, graduated
// confidence tiers (see PERSONALIZATION_THRESHOLDS/PERSONALIZATION_BLEND
// there) instead of this flat count-based cutoff.
export const PERSONALIZATION_THRESHOLD = 3;

class EventService extends BaseService {
    /**
     * Fire-and-forget event write. Never throws to the caller in a way that
     * should block the user's actual action (viewing a page, searching) —
     * callers should treat this as best-effort.
     *
     * seller_id resolution: callers rarely know which seller a viewed
     * product belongs to (a product can be listed by multiple sellers), so
     * if sellerId isn't explicitly passed we best-effort resolve it from
     * productId via ProductSellerSKU (first match — same "only reliable
     * source today" caveat orderService.placeOrder already documents).
     * Purchase events always pass sellerId explicitly (orderService knows
     * it exactly), so this lookup is skipped for the case that matters most
     * for revenue attribution.
     */
    async trackEvent({
        customerId, anonId, eventType, productId, categoryId, searchQuery,
        sellerId, orderId, sessionId, price, quantity, value, currency, deviceType, referrer,
        // Phase 4: context + batch-impression + recommendation fields.
        source, position, placement, productIds, positions, basedOn,
    }) {
        return await this.handleDBOperation(async () => {
            if (!customerId && !anonId) {
                throw new Error('Either customerId or anonId is required to track an event');
            }
            if (!eventType) {
                throw new Error('eventType is required');
            }

            let resolvedSellerId = sellerId || null;
            if (!resolvedSellerId && productId) {
                const sellerSku = await ProductSellerSKU.findOne({ product_id: productId }, { seller_id: 1 }).lean();
                resolvedSellerId = sellerSku?.seller_id?.toString() || null;
            }

            await UserEvent.create({
                customer_id: customerId || null,
                anon_id: anonId || null,
                event_type: eventType,
                product_id: productId || null,
                category_id: categoryId || null,
                search_query: searchQuery || null,
                seller_id: resolvedSellerId,
                order_id: orderId || null,
                session_id: sessionId || null,
                price: price != null ? Number(price) : null,
                quantity: quantity != null ? Number(quantity) : null,
                value: value != null ? Number(value) : null,
                currency: currency || 'INR',
                device_type: deviceType || null,
                referrer: referrer || null,
                source: source || null,
                position: position != null ? Number(position) : null,
                placement: placement || null,
                product_ids: Array.isArray(productIds) && productIds.length > 0 ? productIds : undefined,
                positions: Array.isArray(positions) && positions.length > 0 ? positions.map(Number) : undefined,
                based_on: basedOn || null,
            });

            return { tracked: true };
        });
    }

    /**
     * @deprecated (Phase 4) — superseded by
     * behaviorProfileService.getUserAffinityProfile, which weights event
     * types differently, decays by recency, and returns a graduated
     * confidence tier instead of this binary count cutoff. Left in place
     * only for any external caller that hasn't migrated.
     */
    async getTopCategoriesForIdentity({ customerId, anonId }, limit = 3) {
        return await this.handleDBOperation(async () => {
            if (!customerId && !anonId) return [];

            const identityFilter = customerId ? { customer_id: customerId } : { anon_id: anonId };
            const relevantEvents = await UserEvent.find({
                ...identityFilter,
                event_type: { $in: ['view_product', 'view_category'] },
                category_id: { $ne: null },
            }).lean();

            if (relevantEvents.length < PERSONALIZATION_THRESHOLD) {
                return []; // cold start — not enough signal yet
            }

            const countByCategory = {};
            for (const event of relevantEvents) {
                const key = event.category_id.toString();
                countByCategory[key] = (countByCategory[key] || 0) + 1;
            }

            return Object.entries(countByCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([categoryId]) => categoryId);
        });
    }

    /**
     * Ads-console foundation: this seller's funnel (impressions/views,
     * add-to-cart, purchases + revenue) over a date range, broken down per
     * product so a future campaign UI can show "which of my products get
     * looked at but not bought" etc. Kept as a single aggregation pipeline
     * so swapping the backing store later (e.g. to an OpenSearch index) only
     * means rewriting this one method, not every caller.
     */
    async getSellerAnalytics(sellerId, { from, to } = {}) {
        return await this.handleDBOperation(async () => {
            const match = { seller_id: sellerId };
            if (from || to) {
                match.created_at = {};
                if (from) match.created_at.$gte = new Date(from);
                if (to) match.created_at.$lte = new Date(to);
            }

            const rows = await UserEvent.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { product_id: '$product_id', event_type: '$event_type' },
                        count: { $sum: 1 },
                        revenue: { $sum: { $ifNull: ['$value', 0] } },
                    },
                },
            ]);

            const byProduct = {};
            const totals = { view_product: 0, add_to_cart: 0, purchase: 0, revenue: 0 };

            for (const row of rows) {
                const productId = row._id.product_id || 'unknown';
                const type = row._id.event_type;
                if (!byProduct[productId]) {
                    byProduct[productId] = { product_id: productId, view_product: 0, add_to_cart: 0, purchase: 0, revenue: 0 };
                }
                byProduct[productId][type] = (byProduct[productId][type] || 0) + row.count;
                if (type === 'purchase') byProduct[productId].revenue += row.revenue;

                if (totals[type] !== undefined) totals[type] += row.count;
                if (type === 'purchase') totals.revenue += row.revenue;
            }

            return {
                totals,
                by_product: Object.values(byProduct).sort((a, b) => b.purchase - a.purchase || b.view_product - a.view_product),
            };
        });
    }

    /**
     * A single product's funnel across all sellers — view -> add_to_cart ->
     * purchase counts + revenue. Public/product-page-facing (no seller
     * scoping), unlike getSellerAnalytics which is seller-authenticated.
     */
    async getProductAnalytics(productId) {
        return await this.handleDBOperation(async () => {
            const rows = await UserEvent.aggregate([
                { $match: { product_id: productId, event_type: { $in: ['view_product', 'add_to_cart', 'purchase'] } } },
                { $group: { _id: '$event_type', count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$value', 0] } } } },
            ]);

            const result = { product_id: productId, view_product: 0, add_to_cart: 0, purchase: 0, revenue: 0 };
            for (const row of rows) {
                result[row._id] = row.count;
                if (row._id === 'purchase') result.revenue = row.revenue;
            }
            return result;
        });
    }
}

export default new EventService();
