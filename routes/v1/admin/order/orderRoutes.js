import express from 'express';
import * as OrderController from '../../../../src/controllers/admin/orderController.js';
import * as OrderShippmentController from '../../../../src/controllers/admin/orderShippmentController.js';

const router = express.Router();

router.post('/create', OrderController.storeOrder);

router.get('/send-to-driver', OrderShippmentController.sendOrderToDriverForShippment);

router.post('/driver-accepted', OrderShippmentController.DriverAcceptedOrder);

export default router;