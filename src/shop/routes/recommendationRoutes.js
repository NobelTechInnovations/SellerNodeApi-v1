import express from 'express';
import recommendationController from '../controllers/recommendationController.js';
import optionalAuth from '../middlewares/optionalAuthMiddleware.js';

const router = express.Router();

router.get('/', optionalAuth, recommendationController.getRecommendations);

export default router;
