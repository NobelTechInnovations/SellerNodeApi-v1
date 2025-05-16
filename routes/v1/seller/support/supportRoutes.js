import express from 'express';
import { saveQuery, getQueries } from '../../../../src/controllers/supportController.js';
import auth from '../../../../src/middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Save support query route
router.post('/query', saveQuery);

// Get support queries route
router.get('/queries', getQueries);

export default router; 