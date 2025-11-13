import BaseService from './baseService.js';
import { Cart, CartItem } from '../models/cart/index.js';
import { AppError } from '../utils/index.js';
import Product from '../../models/products/product.js';
import ProductMeta from '../../models/products/productMeta.js';
import ProductCombination from '../../models/products/productCombination.js';
import ProductPrice from '../../models/products/productPrice.js';
import ProductDescription from '../../models/products/productDescription.js';
import User from '../../models/users/user.js';
import SellerBusinessDetails from '../../models/users/sellerBusinessDetails.js';
import SellerWarehouse from '../../models/users/sellerWarehouse.js';
import ProductImage from '../../models/products/productImage.js';
import ProductSellerSku from '../../models/products/productSellerSku.js';
import { Customer } from '../models/index.js';
import FeeService from './feeService.js';
import {CartTransformer} from '../transformers/cart.transformer.js'
import RedisClient from '../../../redis-client.js'


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
                        for (const attributeName in combination.variant) {
                            if (Object.hasOwnProperty.call(combination.variant, attributeName)) {
                                const variantDetail = combination.variant[attributeName];
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
                        images: (combination.imageUrl && Array.isArray(combination.imageUrl) && combination.imageUrl.length > 0) ? combination.imageUrl : (product.images?.[0]?.gallery_images || []),
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

    async addToBulkCart(customer, productsArray) {
    return await this.handleDBOperation(async () => {
        if (!Array.isArray(productsArray) || productsArray.length === 0) {
        return { success: false, message: "No products provided" };
        }

        let cart = await this.getOrCreateCart(customer);

        try {
        for (const rawItem of productsArray) {
            const productId = rawItem.gspin;
            const sku = rawItem.p_sku;
            const quantity = Number(rawItem.quantity || 1) || 1;

            if (!productId) {
            console.warn("Skipping product - missing productId:", rawItem);
            continue;
            }

            const productDetails = await this.fetchProductDetails(productId, sku);

            const existingItem = await CartItem.findOne({
            cartId: cart._id,
            productId: productId,
            sku: sku,
            saveForLater: false
            });

            if (existingItem) {

            existingItem.quantity = (existingItem.quantity || 0) + quantity;
            const unitPrice = productDetails?.price ?? existingItem.basePrice ?? existingItem.price ?? 0;
            existingItem.basePrice = unitPrice;
            existingItem.price = unitPrice;
            existingItem.total = unitPrice * existingItem.quantity;
            await existingItem.save();
            } else {
            // Build additional array from selected_combination.variant if present
            let additional = [];
            if (productDetails?.selected_combination?.variant) {
                // selected_combination.variant might be a Map or an object; handle both
                const variantMap = productDetails.selected_combination.variant;
                if (typeof variantMap.entries === "function") {
                // Map-like
                additional = Array.from(variantMap.entries()).map(([key, value]) => {
                    const v = value._doc || value;
                    return { [key]: v.value };
                });
                } else {
                // plain object
                additional = Object.keys(variantMap).map((key) => {
                    const v = variantMap[key]._doc ?? variantMap[key];
                    return { [key]: v.value ?? v };
                });
                }
            }

            const unitPrice = productDetails?.price ?? 0;

            // create new cart item
            await CartItem.create({
                cartId: cart._id,
                productId: productId,
                quantity: quantity,
                sku: sku,
                type: productDetails?.type ?? rawItem.type ?? "simple",
                price: unitPrice,
                basePrice: unitPrice,
                total: unitPrice * quantity,
                additional,
                productDetails: productDetails
            });
            }
        } // end for

        // update cart totals once
        await this.collectTotals(cart._id);
        await this.invalidateCartCache(cart._id);
        return await this.getCartDetails(cart._id);
        } catch (err) {

        throw err;
        }
    });
    }


   async addToCart(customer, productData) {
        return await this.handleDBOperation(async () => {
            // Find or create active cart for customer
            let cart = await this.getOrCreateCart(customer);

            // ensure quantity
            const qty = Number(productData.quantity ?? 1) || 1;

            // Fetch product details (may be variable/simple)
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
            existingItem.quantity = (existingItem.quantity || 0) + qty;
            existingItem.total = (existingItem.basePrice || existingItem.price || 0) * existingItem.quantity;
            await existingItem.save();
            } else {
            // Build additional array from selected_combination.variant if present
            let additional = [];

            const variant = productDetails?.selected_combination?.variant;

            if (variant) {
                // If it's a Map-like structure (has entries), iterate safely
                if (typeof variant.entries === 'function') {
                try {
                    for (const [key, value] of variant.entries()) {
                    const v = value && (value._doc ?? value);
                    additional.push({ [key]: v?.value ?? v });
                    }
                } catch (e) {
                    // fallback: convert to object and continue
                    console.warn('variant.entries iteration failed, falling back to object iteration', e);
                    try {
                    const obj = Object.fromEntries(variant);
                    for (const key of Object.keys(obj)) {
                        const v = obj[key];
                        const val = v && (v._doc ?? v);
                        additional.push({ [key]: val?.value ?? val });
                    }
                    } catch (e2) {
                    console.warn('fallback conversion failed', e2);
                    }
                }
                } else if (typeof variant === 'object') {
                // plain object
                for (const key of Object.keys(variant)) {
                    const v = variant[key];
                    const val = v && (v._doc ?? v);
                    // support both { attribute: { value: '128GB' } } or simple strings
                    additional.push({ [key]: val?.value ?? val });
                }
                } else {
                // unexpected type — store as-is
                additional.push({ variant });
                }
            }

            // Create new cart item
            await CartItem.create({
                cartId: cart._id,
                productId: productData.productId,
                quantity: qty,
                sku: productData.sku,
                type: productDetails?.type ?? productData.type ?? 'simple',
                price: productDetails?.price ?? 0,
                basePrice: productDetails?.price ?? 0,
                total: (productDetails?.price ?? 0) * qty,
                additional,
                productDetails: productDetails
            });
            }

            // Update cart totals
            await this.collectTotals(cart._id);
            await this.invalidateCartCache(cart._id);
            // return fresh cart details
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

            // Update cart totals
            await this.collectTotals(cart._id);
            await this.invalidateCartCache(cart._id);
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

            // Update cart totals
            await this.collectTotals(cart._id);
            await this.invalidateCartCache(cart._id);
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

            // Update cart totals
            await this.collectTotals(cart._id);
            await this.invalidateCartCache(cart._id);
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

            // Update cart totals
            await this.collectTotals(cart._id);
            await this.invalidateCartCache(cart._id);
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

    async clearCart(customer) {
        return await this.handleDBOperation(async () => {
            const cart = await this.getOrCreateCart(customer);

            // Remove all cart items
            await CartItem.deleteMany({ cartId: cart._id });

            // Reset cart totals
            await this.collectTotals(cart._id);
            await this.invalidateCartCache(cart._id);
            return await this.getCartDetails(cart._id);
        });
    }

    async getCartDetails(cartId) {
        const cacheKey = `cart:${cartId}`;
        const CACHE_TTL = Number(process.env.CART_CACHE_TTL ?? 60); // seconds

        // 1) Try to read from cache (safe)
        try {
            const raw = await RedisClient.get(cacheKey);
            console.log(raw);
            if (raw) {
            try {
                const parsed = JSON.parse(raw);
                return parsed;
            } catch (err) {
                console.warn(`[cache] failed to parse cached payload for ${cacheKey}`, err);
            }
            }
        } catch (redisErr) {
            console.warn(`[cache] GET ${cacheKey} failed (falling back to DB):`, redisErr?.message || redisErr);
        }

        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404);
        }

        const cartItems = await CartItem.find({ cartId }).sort({ createdAt: -1 });

        const userId = cart.customerId || null;
        const customer = userId ? await Customer.findById(userId) : null;

        let fees = { platform_fee_amount: 0, handling_fee_amount: 0, delivery_fee_amount: 0 };
        try {
            if (this.feeService && typeof this.feeService.computeFees === 'function') {
            fees = this.feeService.computeFees(customer);
            } else if (typeof FeeService?.computeFees === 'function') {
            fees = FeeService.computeFees(customer);
            }
        } catch (err) {
            console.warn('Fee computation failed, using zero-fees fallback', err?.message || err);
        }

        const payload = {
            cart: CartTransformer.cart(cart, fees),
            items: CartTransformer.items(cartItems)
        };

        // 3) Cache the payload (best-effort)
        try {
            // node-redis set with EX option expects object form: { EX: ttl }
            // If your Redis client expects different signature (older versions), adjust accordingly.
            await RedisClient.set(cacheKey, JSON.stringify(payload), { EX: CACHE_TTL });
            // Optional: console.debug(`[cache] set ${cacheKey} ttl=${CACHE_TTL}`);
        } catch (redisErr) {
            console.warn(`[cache] SET ${cacheKey} failed (ignored):`, redisErr?.message || redisErr);
        }

        return payload;
    }

    async getCartFullDetails(cartId) {
        const cart = await Cart.findById(cartId);
        if (!cart) {
            throw new AppError('Cart not found', 404);
        }

        const cartItems = await CartItem.find({ 
            cartId,
            saveForLater: false // Only get items that are not saved for later
        }).sort({ createdAt: -1 });

        // Enhance cart items with full product details
        const enhancedItems = await Promise.all(cartItems.map(async (item) => {
            // Get base product details
            const product = await Product.findOne({ product_id: item.productId })
                .populate('category_id', 'name')
                .lean();

            if (!product) {
                return item;
            }

            // Get product description
            const description = await ProductDescription.findOne({ 
                product_id: item.productId 
            }).lean();

            // Get product meta details
            const metaDetails = await ProductMeta.findOne({ 
                product_id: item.productId 
            }).lean();

            // Get product seller SKU details
            const productSellerSku = await ProductSellerSku.findOne({
                product_id: item.productId
            }).lean();

            // Get seller details
            const seller = await User.findById(productSellerSku?.seller_id).lean();

            // Get seller business details
            const sellerBusiness = await SellerBusinessDetails.findOne({
                seller_id: seller?._id
            }).select('business_name business_address pincode location').lean();

            // Base product details
            let productDetails = {
                gspin: product.product_id,
                title: description?.title || '',
                description: description?.description || '',
                meta_details: description?.meta_details || [],
                category: product.category_id?.name || '',
                brand: metaDetails?.brand_details?.name || '',
                type: item.type,
                seller: {
                    business_name: sellerBusiness?.business_name || '',
                    business_address: sellerBusiness?.business_address || '',
                    pincode: sellerBusiness?.pincode || '',
                    location: sellerBusiness?.location || '',
                }
            };

            // Handle pricing based on product type
            if (item.type === 'simple') {
                const price = await ProductPrice.findOne({ product_id: item.productId });
                if (price) {
                    productDetails.price = price.selling_price;
                    productDetails.sku = product.unified_sku;
                }
            } else if (item.type === 'variable') {
                // Get combination details for variable product
                const combination = await ProductCombination.findOne({
                    product_id: item.productId,
                    sku: item.sku
                }).lean();

                if (combination) {
                    // Build variation text for title
                    let variationText = '';
                    if (combination.variant) {
                        variationText = Object.values(combination.variant)
                            .map(v => v.value)
                            .join(', ');
                    }

                    productDetails.selected_combination = {
                        sku: combination.sku,
                        variant: combination.variant,
                        price: combination.price
                    };

                    productDetails.price = combination.price;
                    productDetails.sku = combination.sku;

                    // Update title with variation text
                    productDetails.title = variationText
                        ? `${description?.title || ''} (${variationText})`
                        : description?.title;
                }
            }

            // Get product images
            const productImages = await ProductImage.findOne({ 
                product_id: item.productId 
            }).select('thumbnail_image').lean();

            // Add only thumbnail image
            productDetails.thumbnail = productImages?.thumbnail_image || '';

            return {
                quantity: item.quantity,
                price: item.price,
                total: item.total,
                type: item.type,
                sku: item.sku,
                additional: item.additional || [],
                productDetails
            };
        }));


            const userId = cart.customerId || null;
            const customer = userId ? await Customer.findById(userId) : null;

            let fees = { platform_fee_amount: 0, handling_fee_amount: 0, delivery_fee_amount: 0 };
            try {
                if (this.feeService && typeof this.feeService.computeFees === 'function') {
                fees = this.feeService.computeFees(customer);
                } else if (typeof FeeService?.computeFees === 'function') {
                fees = FeeService.computeFees(customer);
                }
            } catch (err) {
                console.warn('Fee computation failed, using zero-fees fallback', err?.message || err);
            }


        return {
            cart: CartTransformer.cart(cart, fees),
            items: enhancedItems
        };
    }

    async checkoutInfo(customer){
        return await this.handleDBOperation(async () => {
            let cart = await Cart.findOne({
                customerId: customer._id,
                isActive: true
            });
            return cart || null;
        });
    }

    async checkoutAddressInfo(customer) {
        return await this.handleDBOperation(async () => {
            const customerData = await Customer.findById(customer._id)
                .populate('addresses')
                .populate('paymentMethods');
    
            if (!customerData) {
                throw new AppError('Address not found', 404);
            }
    
            return customerData;
        });
    }
    

    async invalidateCartCache(cartId) {
        const cacheKey = `cart:${cartId}`;

        try {
            await RedisClient.del(cacheKey);
            // Optional log:
            // console.log(`[cache] deleted ${cacheKey}`);
        } catch (err) {
            console.warn(`[cache] failed to delete ${cacheKey}:`, err?.message || err);
        }
    }

}

export default new CartService(); 