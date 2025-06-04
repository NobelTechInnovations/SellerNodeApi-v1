import express from 'express';
import cartController from '../controllers/cartController.js';
import auth from '../middlewares/authMiddleware.js';

const router = express.Router();

// All cart routes require authentication
router.use(auth);

// Get cart details
router.get('/', cartController.getCart);

// Add item to cart
router.post('/items', cartController.addToCart);

// Update cart item
router.put('/items/:cartItemId', cartController.updateCartItem);

// Remove item from cart
router.delete('/items/:cartItemId', cartController.removeFromCart);

// Save item for later
router.post('/items/:cartItemId/save', cartController.saveForLater);

// Move item to cart
router.post('/items/:cartItemId/move', cartController.moveToCart);

// Clear cart
router.delete('/', cartController.clearCart);


router.get('/checkout', cartController.checkoutInfo);


export default router; 