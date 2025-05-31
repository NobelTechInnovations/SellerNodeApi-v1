import dotenv from 'dotenv';
import mongoose from 'mongoose';
import algoliasearch from 'algoliasearch/lite.js';
import Product from '../models/products/product.js';
import ProductDescription from '../models/products/productDescription.js';
import ProductPrice from '../models/products/productPrice.js';
import Category from '../models/products/category.js';
import ProductCombination from '../models/products/productCombination.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const index = client.initIndex('products');

async function syncProductsToAlgolia() {
  try {
    // Fetch only published products
    const products = await Product.find({ 
      status: 'published',
      deleted_at: null 
    });
    
    
    const productsToIndex = [];

    for (const product of products) {
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
            type: product.type,
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
          is_variant: false
        });
      }
    }

    // console.log(`Found ${productsToIndex.length} products to index`,productsToIndex);
    // return;
    // Index the products
    await index.saveObjects(productsToIndex);
    console.log(`✅ Successfully indexed ${productsToIndex.length} products`);
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
  } catch (error) {
    console.error('❌ Error syncing products to Algolia:', error);
    process.exit(1);
  }
}

// Run the sync
syncProductsToAlgolia();
