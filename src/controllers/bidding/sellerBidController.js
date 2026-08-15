import biddingService from '../../shop/services/biddingService.js';

// Seller-facing bid management — every method scopes by req.user._id
// server-side (ownership checked in the query/service call itself, not
// just hidden in the frontend), matching the isolation pattern used
// throughout the seller analytics endpoints.

export const listBids = async (req, res) => {
    try {
        const bids = await biddingService.getSellerBids(req.user._id.toString());
        return res.json({ success: true, message: 'Bids fetched', data: bids });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch bids', error: error.message });
    }
};

export const upsertBid = async (req, res) => {
    try {
        const { productId, keyword, bidAmount } = req.body;
        const bid = await biddingService.upsertBid(req.user._id.toString(), { productId, keyword, bidAmount });
        return res.json({ success: true, message: 'Bid saved', data: bid });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Failed to save bid' });
    }
};

export const toggleBid = async (req, res) => {
    try {
        const { bidId } = req.params;
        const bid = await biddingService.toggleBidStatus(req.user._id.toString(), bidId);
        return res.json({ success: true, message: 'Bid status updated', data: bid });
    } catch (error) {
        return res.status(404).json({ success: false, message: error.message || 'Bid not found' });
    }
};

export const suggestBid = async (req, res) => {
    try {
        const { keyword } = req.query;
        const suggestion = await biddingService.suggestBid(keyword);
        return res.json({ success: true, message: 'Bid suggestion generated', data: suggestion });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Failed to generate suggestion' });
    }
};
