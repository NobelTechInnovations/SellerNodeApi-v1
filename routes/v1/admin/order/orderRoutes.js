import express from 'express';
import * as OrderController from '../../../../src/controllers/admin/orderController.js';

const router = express.Router();

router.post('/create', OrderController.storeOrder);

export default router;