import BaseService from './baseService.js';
import UserEvent from '../../models/events/userEvent.js';
import ProductSellerSKU from '../../models/products/productSellerSku.js';
import ProductDescription from '../../models/products/productDescription.js';

const DEFAULT_RANGE_DAYS = 30;

// Minimum sample sizes before the natural-language layer will make a claim
// about a *rate* or a *trend*. Without these, a product with 1 view and 1
// purchase reads as "converts at 100%", and 1→2 views reads as "+100%
// growth" — arithmetically true, statistically meaningless, and corrosive
// to a seller's trust in the rest of the dashboard. Raw per-product numbers
// in the table are unaffected; this only gates the prose insights.
const MIN_VIEWS_FOR_RATE_INSIGHT = 8;
const MIN_VIEWS_FOR_TREND_INSIGHT = 5;
const MAX_INSIGHTS = 6;

function resolveRange({ from, to }) {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
    return { start, end };
}

// The immediately-preceding period of the same length — what "trend vs
// last period" compares against.
function previousEqualRange(start, end) {
    const durationMs = end.getTime() - start.getTime();
    return { start: new Date(start.getTime() - durationMs), end: new Date(start.getTime()) };
}

function pctDelta(current, previous) {
    if (previous == null || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
}

class SellerInsightsService extends BaseService {
    async _getSellerProductIds(sellerId) {
        const skus = await ProductSellerSKU.find({ seller_id: sellerId }, { product_id: 1 }).lean();
        return skus.map((s) => s.product_id);
    }

    async _productTitles(productIds) {
        if (productIds.length === 0) return {};
        const rows = await ProductDescription.find({ product_id: { $in: productIds } }, { product_id: 1, title: 1 }).lean();
        return Object.fromEntries(rows.map((r) => [r.product_id, r.title]));
    }

    /** Per-product funnel for one date range — the shared aggregation behind getProductPerformance's current + previous windows. */
    async _productFunnel(sellerId, start, end) {
        const rows = await UserEvent.aggregate([
            { $match: { seller_id: sellerId, created_at: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: { product_id: '$product_id', event_type: '$event_type' },
                    count: { $sum: 1 },
                    revenue: { $sum: { $ifNull: ['$value', 0] } },
                    // Actual units, not order count — purchase events carry
                    // per-line quantity now (orderService emits one event per
                    // order line). Defaults to 1 for older events written
                    // before quantity was tracked.
                    units: { $sum: { $ifNull: ['$quantity', 1] } },
                    identities: { $addToSet: { $ifNull: ['$customer_id', '$anon_id'] } },
                },
            },
        ]);

        const byProduct = {};
        for (const row of rows) {
            const productId = row._id.product_id;
            if (!productId) continue; // skip events with no product context
            const type = row._id.event_type;
            if (!byProduct[productId]) {
                byProduct[productId] = {
                    product_id: productId, view_product: 0, add_to_cart: 0, checkout_started: 0, purchase: 0,
                    revenue: 0, units: 0, unique_viewers: 0,
                };
            }
            byProduct[productId][type] = (byProduct[productId][type] || 0) + row.count;
            if (type === 'purchase') {
                byProduct[productId].revenue += row.revenue;
                byProduct[productId].units += row.units;
            }
            if (type === 'view_product') byProduct[productId].unique_viewers = row.identities.filter(Boolean).length;
        }

        return byProduct;
    }

    /**
     * Per-product performance table (Section 2 of the seller insights UI):
     * views, unique viewers, add-to-cart rate, checkout starts, purchases,
     * conversion rate, revenue, units sold, and a trend delta vs the
     * immediately-preceding equal-length period. Strictly scoped to
     * `sellerId` — never any other seller's or global data.
     */
    async getProductPerformance(sellerId, { from, to } = {}) {
        return await this.handleDBOperation(async () => {
            const { start, end } = resolveRange({ from, to });
            const prev = previousEqualRange(start, end);

            const [current, previous] = await Promise.all([
                this._productFunnel(sellerId, start, end),
                this._productFunnel(sellerId, prev.start, prev.end),
            ]);

            const productIds = Object.keys(current);
            const titles = await this._productTitles(productIds);

            const rows = productIds.map((productId) => {
                const c = current[productId];
                const p = previous[productId];
                const conversionRate = c.view_product > 0 ? Math.round((c.purchase / c.view_product) * 1000) / 10 : 0;
                const atcRate = c.view_product > 0 ? Math.round((c.add_to_cart / c.view_product) * 1000) / 10 : 0;
                const prevConversionRate = p && p.view_product > 0 ? (p.purchase / p.view_product) * 100 : null;

                return {
                    product_id: productId,
                    title: titles[productId] || productId,
                    views: c.view_product,
                    unique_viewers: c.unique_viewers,
                    add_to_cart: c.add_to_cart,
                    checkout_started: c.checkout_started,
                    purchases: c.purchase,
                    units_sold: c.units, // actual units (sum of per-line quantity), not order count
                    revenue: Math.round(c.revenue * 100) / 100,
                    conversion_rate: conversionRate,
                    add_to_cart_rate: atcRate,
                    trend: p ? {
                        views_delta_pct: pctDelta(c.view_product, p.view_product),
                        conversion_delta_pct: prevConversionRate != null ? Math.round((conversionRate - prevConversionRate) * 10) / 10 : null,
                        revenue_delta_pct: pctDelta(c.revenue, p.revenue),
                    } : null,
                };
            });

            return rows.sort((a, b) => b.revenue - a.revenue || b.views - a.views);
        });
    }

    /**
     * Search keyword intelligence (Section 3) — ONLY keywords whose search
     * results included at least one of this seller's products; never
     * exposes global keyword volume for terms unrelated to this seller's
     * catalog, and never another seller's click/conversion numbers for a
     * shared keyword.
     */
    async getKeywordInsights(sellerId, { from, to } = {}) {
        return await this.handleDBOperation(async () => {
            const { start, end } = resolveRange({ from, to });
            const sellerProductIds = await this._getSellerProductIds(sellerId);
            if (sellerProductIds.length === 0) return [];
            const sellerProductSet = new Set(sellerProductIds);

            const searchEvents = await UserEvent.find(
                { event_type: 'search', created_at: { $gte: start, $lte: end }, search_query: { $ne: null } },
                { search_query: 1, product_ids: 1 }
            ).lean();

            const byKeyword = {};
            for (const evt of searchEvents) {
                const kw = evt.search_query.trim().toLowerCase();
                if (!kw) continue;
                if (!byKeyword[kw]) byKeyword[kw] = { keyword: kw, volume: 0, seller_impressions: 0, seller_product_ids: new Set() };
                byKeyword[kw].volume += 1;
                for (const pid of evt.product_ids || []) {
                    if (sellerProductSet.has(pid)) {
                        byKeyword[kw].seller_impressions += 1;
                        byKeyword[kw].seller_product_ids.add(pid);
                    }
                }
            }

            const relevantKeywords = Object.values(byKeyword).filter((k) => k.seller_impressions > 0);
            if (relevantKeywords.length === 0) return [];

            // Clicks/ATC/purchase for this seller's products, from search —
            // product_click carries search_query+source directly (Phase 4,
            // M4), so this is a precise (not session-approximated) join.
            const keywordList = relevantKeywords.map((k) => k.keyword);
            const clickRows = await UserEvent.aggregate([
                {
                    $match: {
                        event_type: 'product_click', source: 'search', created_at: { $gte: start, $lte: end },
                        product_id: { $in: [...sellerProductSet] },
                    },
                },
                { $addFields: { kw: { $toLower: '$search_query' } } },
                { $match: { kw: { $in: keywordList } } },
                { $group: { _id: '$kw', clicks: { $sum: 1 } } },
            ]);
            const clicksByKeyword = Object.fromEntries(clickRows.map((r) => [r._id, r.clicks]));

            // Add-to-cart/purchase for this seller's products in the same
            // range — attributed to a keyword by revenue-share of that
            // keyword's clicks among all this seller's search-sourced
            // clicks (a reasonable approximation without per-click session
            // stitching, which the current event volume doesn't need yet).
            const totalSearchClicks = Object.values(clicksByKeyword).reduce((a, b) => a + b, 0);
            const conversionRows = await UserEvent.aggregate([
                { $match: { seller_id: sellerId, event_type: { $in: ['add_to_cart', 'purchase'] }, created_at: { $gte: start, $lte: end } } },
                { $group: { _id: '$event_type', count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$value', 0] } } } },
            ]);
            const totalAtc = conversionRows.find((r) => r._id === 'add_to_cart')?.count || 0;
            const totalPurchases = conversionRows.find((r) => r._id === 'purchase')?.count || 0;
            const totalRevenue = conversionRows.find((r) => r._id === 'purchase')?.revenue || 0;

            const result = relevantKeywords.map((k) => {
                const clicks = clicksByKeyword[k.keyword] || 0;
                const share = totalSearchClicks > 0 ? clicks / totalSearchClicks : 0;
                const ctr = k.seller_impressions > 0 ? Math.round((clicks / k.seller_impressions) * 1000) / 10 : 0;
                return {
                    keyword: k.keyword,
                    search_volume: k.volume,
                    seller_impressions: k.seller_impressions,
                    seller_clicks: clicks,
                    ctr,
                    est_add_to_cart: Math.round(totalAtc * share),
                    est_purchases: Math.round(totalPurchases * share),
                    est_revenue: Math.round(totalRevenue * share * 100) / 100,
                };
            });

            // Opportunity flag: top-third search volume + bottom-third CTR
            // among this seller's own relevant keywords — "high demand, you're
            // barely being seen/clicked for it."
            const sortedByVolume = [...result].sort((a, b) => b.search_volume - a.search_volume);
            const volumeThreshold = sortedByVolume[Math.floor(sortedByVolume.length / 3)]?.search_volume ?? 0;
            const sortedByCtr = [...result].sort((a, b) => a.ctr - b.ctr);
            const ctrThreshold = sortedByCtr[Math.floor(sortedByCtr.length / 3)]?.ctr ?? 0;

            return result
                .map((k) => ({ ...k, opportunity: k.search_volume >= volumeThreshold && k.ctr <= ctrThreshold && k.search_volume > 1 }))
                .sort((a, b) => b.search_volume - a.search_volume);
        });
    }

    /**
     * Organic reach/impressions broken down by discovery placement
     * (search/homepage/category/recommendation/related) — helps a seller
     * see WHERE their products actually get found. Impressions come from
     * batch product_impression/recommendation_impression events (matched by
     * product_ids array membership, since those events don't carry a single
     * seller_id — a batch can span multiple sellers' products); clicks/
     * views/purchases come from the seller_id-tagged single-product events.
     */
    async getOrganicReach(sellerId, { from, to } = {}) {
        return await this.handleDBOperation(async () => {
            const { start, end } = resolveRange({ from, to });
            const sellerProductIds = await this._getSellerProductIds(sellerId);
            if (sellerProductIds.length === 0) return [];

            const impressionRows = await UserEvent.aggregate([
                {
                    $match: {
                        event_type: { $in: ['product_impression', 'recommendation_impression'] },
                        created_at: { $gte: start, $lte: end },
                        product_ids: { $in: sellerProductIds },
                    },
                },
                { $unwind: '$product_ids' },
                { $match: { product_ids: { $in: sellerProductIds } } },
                {
                    $group: {
                        _id: { $ifNull: ['$source', '$placement'] },
                        impressions: { $sum: 1 },
                        reach: { $addToSet: { $ifNull: ['$customer_id', '$anon_id'] } },
                    },
                },
            ]);

            const directRows = await UserEvent.aggregate([
                {
                    $match: {
                        seller_id: sellerId,
                        event_type: { $in: ['product_click', 'view_product', 'purchase'] },
                        created_at: { $gte: start, $lte: end },
                    },
                },
                {
                    $group: {
                        _id: { source: { $ifNull: ['$source', 'direct'] }, type: '$event_type' },
                        count: { $sum: 1 },
                        revenue: { $sum: { $ifNull: ['$value', 0] } },
                    },
                },
            ]);

            const bySource = {};
            for (const row of impressionRows) {
                const source = row._id || 'unknown';
                bySource[source] = { source, impressions: row.impressions, reach: row.reach.filter(Boolean).length, clicks: 0, views: 0, purchases: 0, revenue: 0 };
            }
            for (const row of directRows) {
                const source = row._id.source;
                if (!bySource[source]) bySource[source] = { source, impressions: 0, reach: 0, clicks: 0, views: 0, purchases: 0, revenue: 0 };
                if (row._id.type === 'product_click') bySource[source].clicks += row.count;
                if (row._id.type === 'view_product') bySource[source].views += row.count;
                if (row._id.type === 'purchase') { bySource[source].purchases += row.count; bySource[source].revenue += row.revenue; }
            }

            return Object.values(bySource)
                .map((s) => ({ ...s, ctr: s.impressions > 0 ? Math.round((s.clicks / s.impressions) * 1000) / 10 : 0 }))
                .sort((a, b) => b.impressions - a.impressions);
        });
    }

    /**
     * Sales intelligence (Section 5) — best-sellers, fastest-growing/
     * declining, and rule-based (NOT ML-generated) natural-language
     * insights, built directly on top of getProductPerformance's trend data.
     */
    async getSalesIntelligence(sellerId, { from, to } = {}) {
        return await this.handleDBOperation(async () => {
            const products = await this.getProductPerformance(sellerId, { from, to });

            const bestSellers = [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
            const withTrend = products.filter((p) => p.trend);
            // Only surface products that actually grew — previously this took
            // the top 5 by delta regardless of sign, so a seller with no
            // growth at all still saw a "fastest growing" list made of flat
            // and shrinking products. `declining` already filtered this way.
            const fastestGrowing = [...withTrend]
                .filter((p) => (p.trend.views_delta_pct || 0) > 0)
                .sort((a, b) => (b.trend.views_delta_pct || 0) - (a.trend.views_delta_pct || 0))
                .slice(0, 5);
            const declining = [...withTrend].sort((a, b) => (a.trend.views_delta_pct || 0) - (b.trend.views_delta_pct || 0)).slice(0, 5).filter((p) => p.trend.views_delta_pct < 0);

            // Insights are ranked by how actionable they are, then capped —
            // a wall of 15 lines is not "intelligence", it's a data dump.
            const problems = [];
            const opportunities = [];

            for (const p of products) {
                // Rate-based claims need a minimum sample or they're noise:
                // 1 view + 1 purchase is "100% conversion" arithmetically but
                // says nothing real, and telling a seller that actively
                // erodes trust in every other number on the page.
                const hasRateSample = p.views >= MIN_VIEWS_FOR_RATE_INSIGHT;
                const hasTrendSample = p.trend && p.views >= MIN_VIEWS_FOR_TREND_INSIGHT;

                if (hasTrendSample && p.trend.views_delta_pct >= 20 && p.trend.conversion_delta_pct != null && p.trend.conversion_delta_pct <= -5) {
                    problems.push(`${p.title} received ${p.trend.views_delta_pct}% more views this period, but conversion dropped by ${Math.abs(p.trend.conversion_delta_pct)} points — worth checking price, images, or stock.`);
                } else if (hasRateSample && p.views >= 15 && p.add_to_cart_rate < 3) {
                    problems.push(`${p.title} has strong visibility (${p.views} views) but a low add-to-cart rate (${p.add_to_cart_rate}%) — may be a pricing or listing-quality issue.`);
                } else if (hasRateSample && p.views < 20 && p.conversion_rate >= 10) {
                    opportunities.push(`${p.title} gets relatively few views but converts at ${p.conversion_rate}% — worth more visibility.`);
                } else if (hasTrendSample && p.trend.revenue_delta_pct >= 30) {
                    opportunities.push(`${p.title}'s revenue is up ${p.trend.revenue_delta_pct}% vs the previous period.`);
                }
            }

            const insights = [...problems, ...opportunities].slice(0, MAX_INSIGHTS);

            const totals = products.reduce((acc, p) => ({
                revenue: acc.revenue + p.revenue,
                purchases: acc.purchases + p.purchases,
                views: acc.views + p.views,
            }), { revenue: 0, purchases: 0, views: 0 });

            return { best_sellers: bestSellers, fastest_growing: fastestGrowing, declining, insights, totals };
        });
    }
}

export default new SellerInsightsService();
