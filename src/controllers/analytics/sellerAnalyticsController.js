import eventService from '../../shop/services/eventService.js';
import sellerInsightsService from '../../shop/services/sellerInsightsService.js';

// Seller-facing analytics — the data foundation for the Seller Insights &
// Analytics dashboard (Phase 4). Every method below scopes by
// `req.user._id` (the authenticated seller from the `auth` middleware) —
// never a client-supplied seller id — so a seller can only ever see their
// own data, enforced server-side, not just hidden in the UI.

// `period` shortcut (today/yesterday/7d/30d/90d) on top of raw from/to —
// convenience for the frontend's date-range picker.
function resolvePeriod(req) {
    const { period, from, to } = req.query;
    if (from || to) return { from, to };
    if (!period || period === 'custom') return {};

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
        case 'today':
            return { from: startOfToday.toISOString(), to: now.toISOString() };
        case 'yesterday': {
            const start = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
            return { from: start.toISOString(), to: startOfToday.toISOString() };
        }
        case '7d':
            return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() };
        case '90d':
            return { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() };
        case '30d':
        default:
            return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() };
    }
}

export const getOverview = async (req, res) => {
    try {
        const sellerId = req.user._id.toString();
        const result = await eventService.getSellerAnalytics(sellerId, resolvePeriod(req));
        return res.json({ success: true, message: 'Seller analytics fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch seller analytics', error: error.message });
    }
};

export const getProductOverview = async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await eventService.getProductAnalytics(productId);
        return res.json({ success: true, message: 'Product analytics fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch product analytics', error: error.message });
    }
};

export const getProductPerformance = async (req, res) => {
    try {
        const sellerId = req.user._id.toString();
        const result = await sellerInsightsService.getProductPerformance(sellerId, resolvePeriod(req));
        return res.json({ success: true, message: 'Product performance fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch product performance', error: error.message });
    }
};

export const getKeywordInsights = async (req, res) => {
    try {
        const sellerId = req.user._id.toString();
        const result = await sellerInsightsService.getKeywordInsights(sellerId, resolvePeriod(req));
        return res.json({ success: true, message: 'Keyword insights fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch keyword insights', error: error.message });
    }
};

export const getOrganicReach = async (req, res) => {
    try {
        const sellerId = req.user._id.toString();
        const result = await sellerInsightsService.getOrganicReach(sellerId, resolvePeriod(req));
        return res.json({ success: true, message: 'Organic reach fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch organic reach', error: error.message });
    }
};

export const getSalesIntelligence = async (req, res) => {
    try {
        const sellerId = req.user._id.toString();
        const result = await sellerInsightsService.getSalesIntelligence(sellerId, resolvePeriod(req));
        return res.json({ success: true, message: 'Sales intelligence fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch sales intelligence', error: error.message });
    }
};
