import express from 'express';
import { 
  getSellerProfile,
  updatePersonalDetails,
  addBankDetails,
  removeBankDetails,
  updateBusinessDetails,
  updateCommunicationPreferences,
  addWarehouseLocation,
  updateWarehouseLocation,
  deleteWarehouseLocation
} from '../../../../src/controllers/accountController.js';
import auth from '../../../../src/middleware/auth.js';

const router = express.Router();

// Apply seller authentication middleware to all routes
router.use(auth);

// Get seller profile including personal, bank, and business details
router.get('/profile', getSellerProfile);

// Update seller personal details
router.put('/personal-details', updatePersonalDetails);

// Bank details routes - only add new and remove (no updates)
router.post('/bank-details', addBankDetails);
router.delete('/bank-details/:bank_id', removeBankDetails);

// Warehouse location routes
router.post('/warehouse', addWarehouseLocation);
router.put('/warehouse/:warehouse_id', updateWarehouseLocation);
router.delete('/warehouse/:warehouse_id', deleteWarehouseLocation);

// Update business details 
router.put('/business-details', updateBusinessDetails);

// Update communication preferences
router.put('/communication-preferences', updateCommunicationPreferences);

export default router;
