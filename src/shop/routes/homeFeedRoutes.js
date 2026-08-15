import express from 'express';
import homeFeedController from '../controllers/homeFeedController.js';
import optionalAuth from '../middlewares/optionalAuthMiddleware.js';

const router = express.Router();

router.get('/', optionalAuth, homeFeedController.getFeed);

export default router;
