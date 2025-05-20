import express from 'express';
import * as ServiceableZoneController from '../../../src/controllers/mobile/serviceableZoneController.js';

const router = express.Router();

// Check if a location is serviceable
router.post('/check-serviceable-area', ServiceableZoneController.checkServiceableArea);

export default router; 