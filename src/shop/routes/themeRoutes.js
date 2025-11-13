import express from 'express';
import auth from '../middlewares/authMiddleware.js';
import themeController from '../controllers/themeController.js';

const router = express.Router();
// All cart routes require authentication
router.use(auth);

router.get('/header', themeController.header);

export default router; 