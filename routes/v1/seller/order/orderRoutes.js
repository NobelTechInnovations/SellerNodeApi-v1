import express from 'express';
import * as SellerOrderController from '../../../../src/controllers/orders/sellerOrderController.js';
import auth from '../../../../src/middleware/auth.js';
const router = express.Router();

router.get('/list', auth, SellerOrderController.getOrdersBySellerId);
router.post('/:orderId/process', auth, SellerOrderController.processOrder);

export default router;