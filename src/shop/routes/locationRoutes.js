import express from 'express';
import locationController from '../controllers/locationController.js';

const router = express.Router();

// No auth middleware — guest browsers must be able to resolve a manually
// entered pincode/address to lat/lng before ever logging in.
router.post('/resolve', locationController.resolve);

export default router;
