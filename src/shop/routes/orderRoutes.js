import express from 'express';
import orderController from '../controllers/orderController.js';
import auth from '../middlewares/authMiddleware.js';

const router = express.Router();

// A customer's own order history — auth required, ownership is also baked
// into every query in orderService so a customer can never see another
// customer's orders even by guessing an id.
router.use(auth);

router.get('/', orderController.getMyOrders);
router.get('/:orderId', orderController.getOrderDetail);

export default router;
