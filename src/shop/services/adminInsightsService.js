import BaseService from './baseService.js';
import UserEvent from '../../models/events/userEvent.js';
import ProductDescription from '../../models/products/productDescription.js';

const DEFAULT_RANGE_DAYS = 30;

function resolveRange({ from, to }) {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
    return { start, end };
}

// Deep, UNSCOPED platform analytics — admin-only (routes require adminAuth,
// never the seller `auth` middleware). This is the one place in the system
// that's allowed to see behavior/performance data across every seller and
// every buyer at once; sellerInsightsService's equivalent methods are
// always filtered to one seller's own product_ids and never exposed here
// the other way around.
class AdminInsightsService extends BaseService {
    /** Platform-wide funnel: search -> impression -> click -> view -> cart -> checkout -> purchase. */
    async getUserJourneyFunnel({ from, to } = {}) {
        return await this.handleDBOperation(async () => {
            const { start, end } = resolveRange({ from, to });
            const rows = await UserEvent.aggregate([
                { $match: { created_at: { $gte: start, $lte: end } } },
                { $group: { _id: '$event_type', count: { $sum: 1 } } },
            ]);
            const counts = Object.fromEntries(rows.map((r) => [r._id, r.count]));
            return {
                search: counts.search || 0,
                impression: (counts.product_impression || 0) + (counts.recommendation_impression || 0),
                click: (counts.product_click || 0) + (counts.recommendation_click || 0),
                view: counts.view_product || 0,
                add_to_cart: counts.add_to_cart || 0,
                checkout_started: counts.checkout_started || 0,
                purchase: counts.purchase || 0,
            };
        });
    }

    /** Most-viewed / longest-repeated / most-searched products, platform-wide. */
    async getProductBehavior({ from, to } = {}) {
        return await this.handleDBOperation(async () => {
            const { start, end } = resolveRange({ from, to });

            const rows = await UserEvent.aggregate([
                { $match: { created_at: { $gte: start, $lte: end }, product_id: { $ne: null } } },
                {
                    $group: {
                        _id: { product_id: '$product_id', event_type: '$event_type' },
                        count: { $sum: 1 },
                        identities: { $addToSet: { $ifNull: ['$customer_id', '$anon_id'] } },
                    },
                },
            ]);

            const byProduct = {};
            for (const row of rows) {
                const pid = row._id.product_id;
                if (!byProduct[pid]) byProduct[pid] = { product_id: pid, view_product: 0, add_to_cart: 0, purchase: 0, unique_viewers: 0 };
                byProduct[pid][row._id.event_type] = (byProduct[pid][row._id.event_type] || 0) + row.count;
                if (row._id.event_type === 'view_product') byProduct[pid].unique_viewers = row.identities.filter(Boolean).length;
            }

            const productIds = Object.keys(byProduct);
            const titles = await this._productTitles(productIds);
            const all = productIds.map((pid) => ({ ...byProduct[pid], title: titles[pid] || pid }));

            return {
                most_viewed: [...all].sort((a, b) => b.view_product - a.view_product).slice(0, 10),
                most_repeated: [...all].filter((p) => p.unique_viewers > 0).sort((a, b) => (b.view_product / Math.max(b.unique_viewers, 1)) - (a.view_product / Math.max(a.unique_viewers, 1))).slice(0, 10),
                most_purchased: [...all].sort((a, b) => b.purchase - a.purchase).slice(0, 10),
            };
        });
    }

    async _productTitles(productIds) {
        if (productIds.length === 0) return {};
        const rows = await ProductDescription.find({ product_id: { $in: productIds } }, { product_id: 1, title: 1 }).lean();
        return Object.fromEntries(rows.map((r) => [r.product_id, r.title]));
    }

    /** Global search behavior — trending keywords, search-to-click/purchase rate, no-result keywords. */
    async getSearchBehavior({ from, to } = {}) {
        return await this.handleDBOperation(async () => {
            const { start, end } = resolveRange({ from, to });

            const searchEvents = await UserEvent.find(
                { event_type: 'search', created_at: { $gte: start, $lte: end }, search_query: { $ne: null } },
                { search_query: 1, product_ids: 1 }
            ).lean();

            const byKeyword = {};
            for (const evt of searchEvents) {
                const kw = evt.search_query.trim().toLowerCase();
                if (!kw) continue;
                if (!byKeyword[kw]) byKeyword[kw] = { keyword: kw, volume: 0, no_result_count: 0 };
                byKeyword[kw].volume += 1;
                if (!evt.product_ids || evt.product_ids.length === 0) byKeyword[kw].no_result_count += 1;
            }

            const clickRows = await UserEvent.aggregate([
                { $match: { event_type: 'product_click', source: 'search', created_at: { $gte: start, $lte: end }, search_query: { $ne: null } } },
                { $addFields: { kw: { $toLower: '$search_query' } } },
                { $group: { _id: '$kw', clicks: { $sum: 1 } } },
            ]);
            const clicksByKeyword = Object.fromEntries(clickRows.map((r) => [r._id, r.clicks]));

            const trending = Object.values(byKeyword)
                .map((k) => ({
                    ...k,
                    clicks: clicksByKeyword[k.keyword] || 0,
                    click_through_rate: k.volume > 0 ? Math.round(((clicksByKeyword[k.keyword] || 0) / k.volume) * 1000) / 10 : 0,
                }))
                .sort((a, b) => b.volume - a.volume);

            return {
                trending_keywords: trending.slice(0, 15),
                no_result_keywords: trending.filter((k) => k.no_result_count > 0).sort((a, b) => b.no_result_count - a.no_result_count).slice(0, 15),
            };
        });
    }

    /** Recommendation performance, platform-wide: impressions/clicks/CTR/conversion/revenue. */
    async getRecommendationPerformance({ from, to } = {}) {
        return await this.handleDBOperation(async () => {
            const { start, end } = resolveRange({ from, to });

            const impressionRows = await UserEvent.aggregate([
                { $match: { event_type: 'recommendation_impression', created_at: { $gte: start, $lte: end } } },
                { $unwind: '$product_ids' },
                { $group: { _id: '$placement', impressions: { $sum: 1 } } },
            ]);
            const clickRows = await UserEvent.aggregate([
                { $match: { event_type: 'recommendation_click', created_at: { $gte: start, $lte: end } } },
                { $group: { _id: '$placement', clicks: { $sum: 1 } } },
            ]);

            const impressionsByPlacement = Object.fromEntries(impressionRows.map((r) => [r._id || 'unknown', r.impressions]));
            const clicksByPlacement = Object.fromEntries(clickRows.map((r) => [r._id || 'unknown', r.clicks]));
            const placements = new Set([...Object.keys(impressionsByPlacement), ...Object.keys(clicksByPlacement)]);

            return [...placements].map((placement) => {
                const impressions = impressionsByPlacement[placement] || 0;
                const clicks = clicksByPlacement[placement] || 0;
                return {
                    placement,
                    impressions,
                    clicks,
                    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
                };
            }).sort((a, b) => b.impressions - a.impressions);
        });
    }

    /** Platform-wide totals for the admin overview cards. */
    async getPlatformOverview({ from, to } = {}) {
        return await this.handleDBOperation(async () => {
            const { start, end } = resolveRange({ from, to });
            const rows = await UserEvent.aggregate([
                { $match: { created_at: { $gte: start, $lte: end }, event_type: { $in: ['view_product', 'add_to_cart', 'purchase', 'search'] } } },
                { $group: { _id: '$event_type', count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$value', 0] } } } },
            ]);
            const counts = Object.fromEntries(rows.map((r) => [r._id, { count: r.count, revenue: r.revenue }]));
            return {
                total_views: counts.view_product?.count || 0,
                total_searches: counts.search?.count || 0,
                total_add_to_cart: counts.add_to_cart?.count || 0,
                total_purchases: counts.purchase?.count || 0,
                total_revenue: Math.round((counts.purchase?.revenue || 0) * 100) / 100,
            };
        });
    }
}

export default new AdminInsightsService();
