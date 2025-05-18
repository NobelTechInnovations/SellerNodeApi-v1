import mongoose from 'mongoose';
import crypto from 'crypto';
import ProductPrice from '../models/products/productPrice.js';
import ProductCombination from '../models/products/productCombination.js';
import Product from '../models/products/product.js';

/**
 * Convert regular number values to Decimal128 for MongoDB storage
 * @param {Object} priceData - Object containing price fields
 * @returns {Object} - Object with converted Decimal128 values
 */
export const convertToDecimal128 = (priceData) => {
    if (!priceData) return null;
    
    const result = {};
    
    // Convert each price field to Decimal128
    Object.keys(priceData).forEach(key => {
        if (priceData[key] !== null && priceData[key] !== undefined) {
            if (typeof priceData[key] === 'number' || typeof priceData[key] === 'string') {
                result[key] = mongoose.Types.Decimal128.fromString(priceData[key].toString());
            } else {
                result[key] = priceData[key]; // Keep non-numeric values as they are
            }
        }
    });
    
    return result;
};

/**
 * Update product pricing (handles both simple products and variations)
 * @param {String} productId - Product ID
 * @param {Object} pricingData - Price data for simple products
 * @param {Boolean} hasVariations - Whether product has variations
 * @param {Array} combinations - Variation combinations with prices
 * @param {Object} session - MongoDB session for transactions
 * @returns {Promise<void>}
 */
export const updateProductPricing = async (productId, pricingData, hasVariations, combinations, session) => {
    if (!hasVariations && pricingData) {
        // Handle simple product pricing
        const convertedPricing = convertToDecimal128(pricingData);
        
        await ProductPrice.findOneAndUpdate(
            { product_id: productId },
            convertedPricing,
            { new: true, upsert: true, session, runValidators: true }
        );
        
        // Remove any old combinations if they exist
        await ProductCombination.deleteMany({ product_id: productId }, { session });
    } else if (hasVariations) {
        // Remove simple product pricing
        await ProductPrice.deleteOne({ product_id: productId }, { session });
        
        // Handle combination pricing
        if (combinations && combinations.length > 0) {
            // First delete existing combinations
            await ProductCombination.deleteMany({ product_id: productId }, { session });
            
            // Get product to add unified SKU to combinations
            const product = await Product.findOne({ product_id: productId }).session(session);
            if (!product) {
                throw new Error('Product not found for generating combination SKUs');
            }

            // Prepare combinations with Decimal128 prices
            const combinationDocs = combinations.map(combo => ({
                product_id: productId,
                variant: combo.variant,
                price: mongoose.Types.Decimal128.fromString(combo.price.toString()),
                stock: combo.stock,
                imageUrl: combo.imageUrl,
                // Generate a unique SKU for each combination
                sku: `${product.unified_sku}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
            }));
            
            // Insert new combinations
            await ProductCombination.insertMany(combinationDocs, { session });
        }
    }
}; 