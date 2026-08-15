import express from 'express';
import eventController from '../controllers/eventController.js';
import optionalAuth from '../middlewares/optionalAuthMiddleware.js';

const router = express.Router();

router.post('/track', optionalAuth, eventController.track);

export default router;
