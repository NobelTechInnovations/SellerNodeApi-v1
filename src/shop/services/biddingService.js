import BaseService from './baseService.js';
import ProductBid from '../../models/products/productBid.js';
import UserEvent from '../../models/events/userEvent.js';
import ProductSellerSKU from '../../models/products/productSellerSku.js';

// Hard cap on how much a bid can move a product's rank — relevance always
// carries at least 70% of the final score. This directly implements "don't
// blindly optimize for the highest bidder, maintain relevance" — a
// low-relevance product with a huge bid still can't outrank a genuinely
// relevant unboosted one for most queries.
const MAX_BID_WEIGHT = 0.3;

class BiddingService extends BaseService {
    /**
     * Re-ranks an already relevance-ordered product list using active bids
     * for this exact keyword. `products` must already be in relevance order
     * (index 0 = most relevant) — bid boost only nudges within that set, it
     * never injects an unrelated product just because it has a bid.
     * Returns the same array, possibly reordered, with `sponsored: true`
     * added to any product that had an active bid applied — shown as a
     * label in the UI for transparency (standard sponsored-listing practice).
     */
    async applyBidBoost(products, keyword) {
        if (!keyword || products.length === 0) return products;

        const normalizedKeyword = keyword.trim().toLowerCase();
        const productIds = products.map((p) => p.product_id);

        const bids = await ProductBid.find(
            { keyword: normalizedKeyword, status: 'active', product_id: { $in: productIds } },
            { product_id: 1, bid_amount: 1 }
        ).lean();

        if (bids.length === 0) return products;

        const maxBid = Math.max(...bids.map((b) => b.bid_amount));
        const bidByProduct = new Map(bids.map((b) => [b.product_id, b.bid_amount]));

        // Relevance score: since `products` is already ordered by
        // relevance, use inverse rank position as a 0..1 proxy (no need to
        // thread the raw $text score through the whole pipeline for this).
        const n = products.length;
        const scored = products.map((p, i) => {
            const relevanceScore = (n - i) / n; // 1.0 for the most relevant, near 0 for the least
            const bidAmount = bidByProduct.get(p.product_id);
            const bidScore = bidAmount != null && maxBid > 0 ? bidAmount / maxBid : 0;
            const finalScore = relevanceScore * (1 - MAX_BID_WEIGHT) + bidScore * MAX_BID_WEIGHT;
            return { product: p, finalScore, sponsored: bidAmount != null };
        });

        scored.sort((a, b) => b.finalScore - a.finalScore);
        return scored.map((s) => ({ ...s.product, sponsored: s.sponsored || undefined }));
    }

    /** This seller's own bids only — never another seller's. */
    async getSellerBids(sellerId) {
        return await this.handleDBOperation(async () => {
            return await ProductBid.find({ seller_id: sellerId }).sort({ createdAt: -1 }).lean();
        });
    }

    /**
     * Create or update (upsert) a bid. A seller can only bid on a product
     * they actually sell — checked against ProductSellerSKU before writing,
     * not just assumed from the request body — otherwise a seller could pay
     * to boost a competitor's product, which makes no sense and would be a
     * real cross-seller integrity hole.
     */
    async upsertBid(sellerId, { productId, keyword, bidAmount }) {
        return await this.handleDBOperation(async () => {
            if (!productId || !keyword || bidAmount == null) {
                throw new Error('productId, keyword, and bidAmount are required');
            }

            const owns = await ProductSellerSKU.findOne({ product_id: productId, seller_id: sellerId }).lean();
            if (!owns) {
                throw new Error('You can only bid on products you sell');
            }

            const normalizedKeyword = String(keyword).trim().toLowerCase();
            return await ProductBid.findOneAndUpdate(
                { seller_id: sellerId, product_id: productId, keyword: normalizedKeyword },
                { $set: { bid_amount: Number(bidAmount), status: 'active' } },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        });
    }

    /** Ownership-checked in the query itself — a seller can only toggle their own bid. */
    async toggleBidStatus(sellerId, bidId) {
        return await this.handleDBOperation(async () => {
            const bid = await ProductBid.findOne({ _id: bidId, seller_id: sellerId });
            if (!bid) throw new Error('Bid not found for this seller');
            bid.status = bid.status === 'active' ? 'paused' : 'active';
            await bid.save();
            return bid;
        });
    }

    /**
     * Heuristic suggested bid range for a keyword — NOT a trained model,
     * just: look at what other sellers are already bidding for this exact
     * keyword (percentile range), and if nobody has, fall back to a base
     * rate scaled by how often the keyword has actually been searched
     * recently. Explains itself so a seller isn't just shown a number.
     */
    async suggestBid(keyword) {
        return await this.handleDBOperation(async () => {
            const normalizedKeyword = String(keyword || '').trim().toLowerCase();
            if (!normalizedKeyword) throw new Error('keyword is required');

            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const searchVolume = await UserEvent.countDocuments({
                event_type: 'search', search_query: { $regex: normalizedKeyword, $options: 'i' }, created_at: { $gte: since },
            });

            const competingBids = await ProductBid.find({ keyword: normalizedKeyword, status: 'active' }, { bid_amount: 1 }).lean();

            let low, high, basis;
            if (competingBids.length > 0) {
                const amounts = competingBids.map((b) => b.bid_amount).sort((a, b) => a - b);
                const percentile = (p) => amounts[Math.floor((amounts.length - 1) * p)];
                low = percentile(0.5);   // median
                high = percentile(0.75);
                basis = `based on ${competingBids.length} competing bid${competingBids.length > 1 ? 's' : ''} for this keyword`;
            } else {
                // No competition yet — base rate scaled by search-volume tier.
                const tier = searchVolume >= 50 ? 3 : searchVolume >= 10 ? 2 : 1;
                low = 5 * tier;
                high = 15 * tier;
                basis = 'based on recent search volume (no competing bids yet)';
            }

            return {
                keyword: normalizedKeyword,
                suggested_min: Math.round(low),
                suggested_max: Math.round(high),
                search_volume_30d: searchVolume,
                competing_bids: competingBids.length,
                explanation: `"${normalizedKeyword}" was searched ${searchVolume} time${searchVolume === 1 ? '' : 's'} in the last 30 days, with ${competingBids.length} other seller${competingBids.length === 1 ? '' : 's'} currently bidding on it. Suggested range is ${basis}.`,
            };
        });
    }
}

export default new BiddingService();
