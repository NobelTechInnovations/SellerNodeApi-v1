import express from 'express';
import * as SellerOrderController from '../../../../src/controllers/orders/sellerOrderController.js';

const router = express.Router();

router.get('/list', SellerOrderController.getOrdersBySellerId);
router.post('/:orderId/process', SellerOrderController.processOrder);

export default router;