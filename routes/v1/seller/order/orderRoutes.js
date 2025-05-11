import express from 'express';
import * as SellerOrderController from '../../../../src/controllers/orders/sellerOrderController.js';

const router = express.Router();

router.get('/list', SellerOrderController.getOrdersBySellerId);

export default router;