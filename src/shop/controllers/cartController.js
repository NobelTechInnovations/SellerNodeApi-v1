import BaseController from './baseController.js';
import cartService from '../services/cartService.js';
import { catchAsync } from '../utils/index.js';

class CartController extends BaseController {
    getCart = catchAsync(async (req, res) => {
        const cart = await cartService.getOrCreateCart(req.customer);
        if (cart) {
            const cartDetails = await cartService.getCartDetails(cart._id);
            return this.sendResponse(res, cartDetails, 'Cart retrieved successfully');
        }
        return this.sendResponse(res, {}, 'Cart is empty');
        
    });

    addToCart = catchAsync(async (req, res) => {
        const result = await cartService.addToCart(req.customer, req.body);
        return this.sendResponse(res, result, 'Item added to cart successfully');
    });

    updateCartItem = catchAsync(async (req, res) => {
        const { cartItemId } = req.params;
        const result = await cartService.updateCartItem(req.customer, cartItemId, req.body);
        return this.sendResponse(res, result, 'Cart item updated successfully');
    });

    removeFromCart = catchAsync(async (req, res) => {
        const { cartItemId } = req.params;
        const result = await cartService.removeFromCart(req.customer, cartItemId);
        return this.sendResponse(res, result, 'Item removed from cart successfully');
    });

    saveForLater = catchAsync(async (req, res) => {
        const { cartItemId } = req.params;
        const result = await cartService.saveForLater(req.customer, cartItemId);
        return this.sendResponse(res, result, 'Item saved for later successfully');
    });

    moveToCart = catchAsync(async (req, res) => {
        const { cartItemId } = req.params;
        const result = await cartService.moveToCart(req.customer, cartItemId);
        return this.sendResponse(res, result, 'Item moved to cart successfully');
    });

    clearCart = catchAsync(async (req, res) => {
        const result = await cartService.clearCart(req.customer);
        return this.sendResponse(res, result, 'Cart cleared successfully');
    });

    checkoutInfo = catchAsync(async (req,res) => {
        const cart = await cartService.checkoutInfo(req.customer);
        if(cart){
            const cartDetails = await cartService.getCartFullDetails(cart._id);
            return this.sendResponse(res, cartDetails, 'Cart cleared successfully');
        }
        return this.sendResponse(res, {}, 'Cart is empty');
    })
}

export default new CartController(); 