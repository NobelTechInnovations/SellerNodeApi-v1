import express from 'express';
import * as basicApiController from '../../../../src/controllers/mobile/basicApiController.js';

const router = express.Router();

// Check if a location is serviceable
router.get('/check-serviceable-area', basicApiController.getServiceableZone);

// send all category to mobile app
router.get('/send-all-category-to-mobile-app', basicApiController.sendAllCategoryToMobileApp);

export default router; 