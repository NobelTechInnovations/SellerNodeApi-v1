import express from 'express';
import wishlistController from '../controllers/wishlistController.js';
import auth from '../middlewares/authMiddleware.js';

const router = express.Router();

// Wishlist is inherently per-customer — every route requires auth.
router.use(auth);

router.get('/', wishlistController.list);
router.post('/toggle', wishlistController.toggle);
router.get('/check/:productId', wishlistController.check);

export default router;
