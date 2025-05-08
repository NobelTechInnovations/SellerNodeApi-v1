import express from 'express';
import * as AdminController from '../../../../src/controllers/adminController.js';

const router = express.Router();

router.post('/', AdminController.login);

export default router;