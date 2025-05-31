import algoliasearch from 'algoliasearch/lite.js';
import ProductDescription from '../models/products/productDescription.js';
import Category from '../models/products/category.js';
import ProductCombination from '../models/products/productCombination.js';
import ProductPrice from '../models/products/productPrice.js';
import ProductImage from '../models/products/productImage.js';

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const index = client.initIndex('products');

/**
 * Index a single product and its variants to Algolia
 * @param {Object} product - The product document from MongoDB
 * @returns {Promise<Array>} Array of indexed objects
 */
export const indexProductToAlgolia = async (product) => {
  try {
    const productsToIndex = [];

    // Get product description
    const description = await ProductDescription.findOne({ 
      product_id: product.product_id,
      language: 'en'
    });

    // Get category details
    let categoryName = '';
    if (product.category_id) {
      const category = await Category.findById(product.category_id);
      if (category) {
        categoryName = category.name;
      }
    }

    // Get product image
    const productImage = await ProductImage.findOne({ product_id: product.product_id });

    if (product.type === 'variable') {
      // For variable products, get all combinations
      const combinations = await ProductCombination.find({ 
        product_id: product.product_id 
      });

      // Create an index record for each combination
      for (const combination of combinations) {
        const variantDetails = Array.from(combination.variant.entries()).map(([key, value]) => ({
          attribute: key,
          value: value.value
        }));

        productsToIndex.push({
          objectID: `${product.product_id}-${combination.sku}`,
          product_id: product.product_id,
          name: description?.title || '',
          sku: combination.sku,
          description: description?.description || '',
          price: combination.price,
          category: categoryName,
          brand: product.brand || '',
          type: 'variable_combination',
          condition: product.condition || 'new',
          status: product.status,
          is_variant: true,
          variant_details: variantDetails,
          stock: combination.stock,
          image_url: combination.imageUrl?.[0] || null
        });
      }
    } else {
      // For simple products, get price from ProductPrice
      const price = await ProductPrice.findOne({ 
        product_id: product.product_id 
      });

      productsToIndex.push({
        objectID: product.product_id,
        product_id: product.product_id,
        name: description?.title || '',
        sku: product.unified_sku,
        description: description?.description || '',
        price: price?.selling_price || 0,
        category: categoryName,
        brand: product.brand || '',
        type: product.type,
        condition: product.condition || 'new',
        status: product.status,
        is_variant: false,
        image_url: productImage?.thumbnail_image || null
      });
    }

    // Index the products
    if (productsToIndex.length > 0) {
      await index.saveObjects(productsToIndex);
    }

    return productsToIndex;
  } catch (error) {
    console.error('Error indexing product to Algolia:', error);
    throw error;
  }
};

/**
 * Remove a product and its variants from Algolia
 * @param {string} productId - The product ID to remove
 * @returns {Promise<void>}
 */
export const removeProductFromAlgolia = async (productId) => {
  try {
    // For variable products, we need to remove all variant combinations
    const combinations = await ProductCombination.find({ product_id: productId });
    const objectIDs = combinations.map(combo => `${productId}-${combo.sku}`);
    
    // Add the main product ID
    objectIDs.push(productId);

    // Delete all objects
    await index.deleteObjects(objectIDs);
  } catch (error) {
    console.error('Error removing product from Algolia:', error);
    throw error;
  }
}; 