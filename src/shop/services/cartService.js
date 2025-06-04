import BaseService from './baseService.js';
import { Cart, CartItem } from '../models/cart/index.js';
import { AppError } from '../utils/index.js';
import Product from '../../models/products/product.js';
import ProductMeta from '../../models/products/productMeta.js';
import ProductCombination from '../../models/products/productCombination.js';
import ProductPrice from '../../models/products/productPrice.js';

class CartService extends BaseService {
    async getOrCreateCart(customer) {
        return await this.handleDBOperation(async () => {
            // Find active cart for customer
            let cart = await Cart.findOne({
                customerId: customer._id,
                isActive: true
            });

            // If no active cart exists, create one
            if (!cart) {
                cart = await Cart.create({
                    customerId: customer._id,
                    phone: customer.phone
                });
            }

            return cart;
        });
    }

    async fetchProductDetails(productId, selected_sku) {
        try {
            // Fetch product with populated virtual fields
            const product = await Product.findOne({ product_id: productId })
                .populate({
                    path: 'images',
                    select: 'gallery_images'
                })
                .populate({
                    path: 'descriptions',
                    match: { language: 'en' },
                    select: 'title'
                });

            if (!product) {
                throw new AppError('Product not found', 404);
            }

            // Get product meta to check if it's a variable product
            const meta = await ProductMeta.findOne({ product_id: productId });

            let productDetails = {
                name: product.descriptions?.[0]?.title || '',
                images: product.images?.[0]?.gallery_images || [],
                price: 0,
                sellerId: product.sellerId,
                sellerName: product.sellerName,
                type: meta?.has_variations ? 'variable' : 'simple',
                unified_sku: product.unified_sku,
                sku: product.unified_sku // Default to unified SKU
            };

            // If it's a variable product, get the combination details
            if (meta?.has_variations) {
                const combination = await ProductCombination.findOne({
                    product_id: productId,
                    sku: selected_sku
                });

                if (combination) {
                    // Get variation text for title
                    let variationParts = [];
                    if (combination.variant && typeof combination.variant === 'object') {
                        // Iterate over the object keys (attribute names)
                         for (const attributeName in combination.variant) {
                            if (Object.hasOwnProperty.call(combination.variant, attributeName)) {
                                const variantDetail = combination.variant[attributeName];
                                // Check if the variant detail object has a value and add it to parts
                                if (variantDetail && variantDetail.value) {
                                    variationParts.push(variantDetail.value);
                                }
                            }
                         }
                    }
                    
                    const variationText = variationParts.join(', ');

                    // Update product details with combination info
                    productDetails = {
                        ...productDetails,
                        name: variationText ? `${product.descriptions?.[0]?.title} (${variationText})` : product.descriptions?.[0]?.title,
                         // Use combination images if available and not empty, otherwise use product images
                        images: (combination.imageUrl && Array.isArray(combination.imageUrl) && combination.imageUrl.length > 0) ? combination.imageUrl[0] : (product.images?.[0]?.gallery_images || []),
                        price: combination.price,
                        sku: combination.sku,
                        selected_combination: {
                            sku: combination.sku,
                            variant: combination.variant,
                            stock: combination.stock,
                            imageUrl: combination.imageUrl,
                            price: combination.price
                        }
                    };
                }
            } else {
                // For simple products, get the price
                const price = await ProductPrice.findOne({ product_id: productId });
                if (price) {
                    productDetails.price = price.selling_price;
                }
            }

            return productDetails;
        } catch (error) {
            console.error('Error fetching product details:', error);
            throw new AppError('Failed to fetch product details', 500);
        }
    }

    async addToCart(customer, productData) {
        return await this.handleDBOperation(async () => {
            // Find or create active cart for customer
            let cart = await Cart.findOne({
                customerId: customer._id,
                isActive: true
            });

            if (!cart) {
                cart = await Cart.create({
                    customerId: customer._id,
                    phone: customer.phone
                });
            }

            // Fetch product details from product database, passing the selected SKU
            const productDetails = await this.fetchProductDetails(productData.productId, productData.sku);

            // Check if product already exists in cart with the same SKU
            const existingItem = await CartItem.findOne({
                cartId: cart._id,
                productId: productData.productId,
                sku: productData.sku,
                saveForLater: false
            });

            if (existingItem) {
                // Update existing item quantity
                existingItem.quantity += productData.quantity;
                existingItem.total = existingItem.basePrice * existingItem.quantity;
                await existingItem.save();
            } else {
                // Create new cart item
                await CartItem.create({
                    cartId: cart._id,
                    productId: productData.productId,
                    quantity: productData.quantity,
                    sku: productData.sku,
                    type: productDetails.type,
                    price: productDetails.price,
                    basePrice: productDetails.price,
                    total: productDetails.price * productData.quantity,
                    additional: productData.additional || {},
                    productDetails: productDetails
                });
            }

            // Update cart totals using the new function
            await this.collectTotals(cart._id);

            return await this.getCartDetails(cart._id);
        });
    }

    async updateCartItem(customer, cartItemId, updateData) {
        return await this.handleDBOperation(async () => {
            const cart = await this.getOrCreateCart(customer);

            const cartItem = await CartItem.findOne({
                _id: cartItemId,
                cartId: cart._id
            });

            if (!cartItem) {
                throw new AppError('Cart item not found', 404);
            }

            // If quantity is being updated, verify product availability
            if (updateData.quantity !== undefined) { // Check if quantity is in updateData
                // We need the selected SKU to fetch correct product details for availability check
                const productDetails = await this.fetchProductDetails(cartItem.productId, cartItem.sku);
                // Add any product availability checks here using productDetails.selected_combination.stock
                if (productDetails.type === 'variable' && updateData.quantity > productDetails.selected_combination?.stock) {
                     throw new AppError(`Only ${productDetails.selected_combination.stock} items in stock.`, 400);
                } else if (productDetails.type === 'simple') { // Add check for simple product stock
                    const productMeta = await ProductMeta.findOne({ product_id: cartItem.productId });
                    if (productMeta && updateData.quantity > productMeta.stock) {
                        throw new AppError(`Only ${productMeta.stock} items in stock.`, 400);
                    }
                }
            }

            // Update cart item
            Object.assign(cartItem, updateData);
            if (updateData.quantity !== undefined) { // Only update total if quantity is updated
                cartItem.total = cartItem.basePrice * updateData.quantity;
            }
            await cartItem.save();

            // Update cart totals using the new function
            await this.collectTotals(cart._id);

            return await this.getCartDetails(cart._id);
        });
    }

    async removeFromCart(customer, cartItemId) {
        return await this.handleDBOperation(async () => {
            const cart = await this.getOrCreateCart(customer);

            const result = await CartItem.deleteOne({
                _id: cartItemId,
                cartId: cart._id
            });

            if (result.deletedCount === 0) {
                throw new AppError('Cart item not found', 404);
            }

            // Update cart totals using the new function
            await this.collectTotals(cart._id);

            return await this.getCartDetails(cart._id);
        });
    }

    async saveForLater(customer, cartItemId) {
        return await this.handleDBOperation(async () => {
            const cart = await this.getOrCreateCart(customer);

            const cartItem = await CartItem.findOne({
                _id: cartItemId,
                cartId: cart._id
            });

            if (!cartItem) {
                throw new AppError('Cart item not found', 404);
            }

            cartItem.saveForLater = true;
            await cartItem.save();

            // Update cart totals using the new function
            await this.collectTotals(cart._id);

            return await this.getCartDetails(cart._id);
        });
    }

    async moveToCart(customer, cartItemId) {
        return await this.handleDBOperation(async () => {
            const cart = await this.getOrCreateCart(customer);

            const cartItem = await CartItem.findOne({
                _id: cartItemId,
                cartId: cart._id
            });

            if (!cartItem) {
                throw new AppError('Cart item not found', 404);
            }

            // Verify product is still available
            // We need the selected SKU to fetch correct product details for availability check
            const productDetails = await this.fetchProductDetails(cartItem.productId, cartItem.sku);
            // Add any product availability checks here using productDetails.selected_combination.stock
            if (productDetails.type === 'variable' && productDetails.selected_combination?.stock === 0) {
                 throw new AppError('Product is out of stock.', 400);
            } else if (productDetails.type === 'simple') { // Add check for simple product stock
                 const productMeta = await ProductMeta.findOne({ product_id: cartItem.productId });
                 if (productMeta && productMeta.stock === 0) {
                     throw new AppError('Product is out of stock.', 400);
                 }
            }

            cartItem.saveForLater = false;
            await cartItem.save();

            // Update cart totals using the new function
            await this.collectTotals(cart._id);

            return await this.getCartDetails(cart._id);
        });
    }

    // Renamed and refactored from updateCartTotals
    async collectTotals(cartId) {
        const cartItems = await CartItem.find({
            cartId,
            saveForLater: false
        });

        const totals = cartItems.reduce((acc, item) => ({
            totalItems: acc.totalItems + 1,
            totalQuantity: acc.totalQuantity + item.quantity,
            subtotal: acc.subtotal + item.total,
            tax: acc.tax + item.taxAmount,
            discount: acc.discount + item.discountAmount
        }), {
            totalItems: 0,
            totalQuantity: 0,
            subtotal: 0,
            tax: 0,
            discount: 0
        });

        // Calculate final amount
        totals.finalAmount = totals.subtotal + totals.tax - totals.discount;

        // Update the cart document with the new totals
        await Cart.findByIdAndUpdate(cartId, totals);
    }

    async getCartDetails(cartId) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404);
        }

        const cartItems = await CartItem.find({ cartId })
            .sort({ createdAt: -1 });

        return {
            cart,
            items: cartItems
        };
    }

    async clearCart(customer) {
        return await this.handleDBOperation(async () => {
            const cart = await this.getOrCreateCart(customer);

            // Remove all cart items
            await CartItem.deleteMany({ cartId: cart._id });

            // Reset cart totals using the new function
            await this.collectTotals(cart._id);

            return await this.getCartDetails(cart._id);
        });
    }
}

export default new CartService(); 