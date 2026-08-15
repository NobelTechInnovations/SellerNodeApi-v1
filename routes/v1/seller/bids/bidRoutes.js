import express from 'express';
import * as SellerBidController from '../../../../src/controllers/bidding/sellerBidController.js';
import auth from '../../../../src/middleware/auth.js';

const router = express.Router();

router.get('/', auth, SellerBidController.listBids);
router.post('/', auth, SellerBidController.upsertBid);
router.get('/suggest', auth, SellerBidController.suggestBid);
router.patch('/:bidId/toggle', auth, SellerBidController.toggleBid);

export default router;
