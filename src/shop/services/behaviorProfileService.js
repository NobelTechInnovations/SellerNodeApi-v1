import BaseService from './baseService.js';
import UserEvent from '../../models/events/userEvent.js';

// How much signal each event type contributes to a user's affinity score.
// Deliberately NOT binary — a single view_product (weight 1) barely moves
// the needle, while a purchase (weight 10) or repeated deep engagement
// (scroll/read) compounds. Negative weight on remove_from_cart lets an
// "added then removed" product actively lose affinity instead of just
// being ignored.
const EVENT_WEIGHTS = {
    view_product: 1,
    view_category: 1,
    product_scroll: 0.5,
    product_content_read: 0.5,
    product_image_view: 0.3,
    add_to_cart: 5,
    remove_from_cart: -2,
    wishlist: 2,
    purchase: 10,
    search: 2,
};

// Recency decay, bucketed (cheap in an aggregation vs. a per-row exp()
// curve) — a view from an hour ago should count for more than one from
// six weeks ago, but we don't need continuous precision to get that right.
const RECENCY_BUCKETS = [
    { maxDays: 1, multiplier: 1.0 },
    { maxDays: 7, multiplier: 0.7 },
    { maxDays: 30, multiplier: 0.4 },
    { maxDays: Infinity, multiplier: 0.2 },
];

// Confidence tiers — the whole point of this service. A single click does
// NOT mean "the user likes this." Confidence only reaches 'strong' after
// sustained, varied, weighted signal (frequency + recency + repetition +
// higher-intent actions like cart/purchase), matching the "don't judge on
// the first click" requirement. Tunable constants, not derived from any
// formal model — a reasonable starting point for this catalog's scale.
export const CONFIDENCE_THRESHOLDS = { weak: 5, medium: 15, strong: 40 };

// How aggressively each confidence tier should let personalized content
// replace default/trending content — consumed by homeFeedService and
// recommendationService so nothing "strongly suggests" off a cold profile.
export const PERSONALIZATION_BLEND = {
    cold: 0,     // 0% personalized — all default/trending
    weak: 0.3,
    medium: 0.5,
    strong: 0.8, // never 100% — always keep some default/trending in the mix
};

function tierFor(totalWeight) {
    if (totalWeight >= CONFIDENCE_THRESHOLDS.strong) return 'strong';
    if (totalWeight >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
    if (totalWeight >= CONFIDENCE_THRESHOLDS.weak) return 'weak';
    return 'cold';
}

// The weight/recency pipeline stages shared by every $facet branch below.
const WEIGHTED_STAGES = [
    {
        $addFields: {
            _baseWeight: {
                $switch: {
                    branches: Object.entries(EVENT_WEIGHTS).map(([type, weight]) => ({
                        case: { $eq: ['$event_type', type] },
                        then: weight,
                    })),
                    default: 0,
                },
            },
            _daysOld: { $dateDiff: { startDate: '$created_at', endDate: '$$NOW', unit: 'day' } },
        },
    },
    {
        $addFields: {
            _recencyMultiplier: {
                $switch: {
                    branches: RECENCY_BUCKETS.filter((b) => b.maxDays !== Infinity).map((b) => ({
                        case: { $lte: ['$_daysOld', b.maxDays] },
                        then: b.multiplier,
                    })),
                    default: RECENCY_BUCKETS[RECENCY_BUCKETS.length - 1].multiplier,
                },
            },
        },
    },
    { $addFields: { _weight: { $multiply: ['$_baseWeight', '$_recencyMultiplier'] } } },
];

class BehaviorProfileService extends BaseService {
    /**
     * A weighted, recency-aware, multi-signal affinity profile for one
     * identity (customer or guest). This is the generalization of Phase 2's
     * getTopCategoriesForIdentity — instead of a binary "3+ events or
     * nothing" gate, it returns a graduated confidence tier plus ranked
     * category/product affinity scores that homeFeedService and
     * recommendationService both blend against PERSONALIZATION_BLEND.
     *
     * Looks back 90 days only — older signal is both stale and not worth
     * the scan cost at this data volume.
     */
    async getUserAffinityProfile({ customerId, anonId }) {
        return await this.handleDBOperation(async () => {
            if (!customerId && !anonId) {
                return { confidence: 'cold', totalWeight: 0, categoryAffinity: [], productAffinity: [], priceRangeAffinity: null, personalizedBlend: PERSONALIZATION_BLEND['cold'] };
            }

            const identityFilter = customerId ? { customer_id: customerId } : { anon_id: anonId };
            const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

            const [result] = await UserEvent.aggregate([
                { $match: { ...identityFilter, created_at: { $gte: since } } },
                ...WEIGHTED_STAGES,
                {
                    $facet: {
                        total: [{ $group: { _id: null, totalWeight: { $sum: '$_weight' } } }],
                        byCategory: [
                            { $match: { category_id: { $ne: null } } },
                            { $group: { _id: '$category_id', score: { $sum: '$_weight' } } },
                            { $sort: { score: -1 } },
                            { $limit: 8 },
                        ],
                        byProduct: [
                            { $match: { product_id: { $ne: null } } },
                            {
                                $group: {
                                    _id: '$product_id',
                                    score: { $sum: '$_weight' },
                                    viewCount: { $sum: { $cond: [{ $eq: ['$event_type', 'view_product'] }, 1, 0] } },
                                    lastEventAt: { $max: '$created_at' },
                                },
                            },
                            { $sort: { score: -1 } },
                            { $limit: 12 },
                        ],
                        // Price range affinity: best-effort — only events that
                        // captured a price snapshot (add_to_cart/purchase
                        // today) contribute, so this can legitimately be null
                        // for a profile that's only ever browsed.
                        priceRange: [
                            { $match: { price: { $ne: null } } },
                            { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' }, avg: { $avg: '$price' } } },
                        ],
                    },
                },
            ]);

            const totalWeight = result?.total?.[0]?.totalWeight || 0;
            const confidence = tierFor(totalWeight);

            return {
                confidence,
                totalWeight: Math.round(totalWeight * 100) / 100,
                personalizedBlend: PERSONALIZATION_BLEND[confidence],
                categoryAffinity: (result?.byCategory || []).map((c) => ({ category_id: c._id.toString(), score: Math.round(c.score * 100) / 100 })),
                productAffinity: (result?.byProduct || []).map((p) => ({
                    product_id: p._id,
                    score: Math.round(p.score * 100) / 100,
                    viewCount: p.viewCount,
                    lastEventAt: p.lastEventAt,
                })),
                priceRangeAffinity: result?.priceRange?.[0]
                    ? { min: result.priceRange[0].min, max: result.priceRange[0].max, avg: Math.round(result.priceRange[0].avg) }
                    : null,
            };
        });
    }
}

export default new BehaviorProfileService();
