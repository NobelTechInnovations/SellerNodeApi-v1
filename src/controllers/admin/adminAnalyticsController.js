import adminInsightsService from '../../shop/services/adminInsightsService.js';

// Admin-only, platform-wide analytics — every route this backs is mounted
// behind `adminAuth` (never the seller `auth` middleware), so a seller
// token can never reach these, and these never scope by seller_id — the
// intentional inverse of the seller insights endpoints.

function resolvePeriod(req) {
    const { period, from, to } = req.query;
    if (from || to) return { from, to };
    if (!period || period === 'custom') return {};

    const now = new Date();
    switch (period) {
        case '7d': return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() };
        case '90d': return { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() };
        case '30d':
        default: return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString() };
    }
}

export const getOverview = async (req, res) => {
    try {
        const result = await adminInsightsService.getPlatformOverview(resolvePeriod(req));
        return res.json({ success: true, message: 'Platform overview fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch platform overview', error: error.message });
    }
};

export const getUserJourney = async (req, res) => {
    try {
        const result = await adminInsightsService.getUserJourneyFunnel(resolvePeriod(req));
        return res.json({ success: true, message: 'User journey funnel fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch user journey', error: error.message });
    }
};

export const getProductBehavior = async (req, res) => {
    try {
        const result = await adminInsightsService.getProductBehavior(resolvePeriod(req));
        return res.json({ success: true, message: 'Product behavior fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch product behavior', error: error.message });
    }
};

export const getSearchBehavior = async (req, res) => {
    try {
        const result = await adminInsightsService.getSearchBehavior(resolvePeriod(req));
        return res.json({ success: true, message: 'Search behavior fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch search behavior', error: error.message });
    }
};

export const getRecommendationPerformance = async (req, res) => {
    try {
        const result = await adminInsightsService.getRecommendationPerformance(resolvePeriod(req));
        return res.json({ success: true, message: 'Recommendation performance fetched', data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch recommendation performance', error: error.message });
    }
};
