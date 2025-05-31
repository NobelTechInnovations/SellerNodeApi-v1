import dotenv from 'dotenv';
import mongoose from 'mongoose';
import algoliasearch from 'algoliasearch';
import Product from '../models/products/product.js';

dotenv.config();

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const index = client.initIndex('products');

const getPriceRange = (price) => {
  if (!price) return '0-10';
  if (price <= 10) return '0-10';
  if (price <= 50) return '11-50';
  if (price <= 100) return '51-100';
  if (price <= 500) return '101-500';
  return '500+';
};

async function syncProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const products = await Product.find({
      status: 'published',
      deleted_at: null,
    }).populate([
      { path: 'images', select: 'url' },
      { path: 'descriptions', select: 'name description' },
    ]);

    console.log(`📦 Found ${products.length} products`);

    const algoliaProducts = products.map((product) => {
      const description = product.descriptions?.[0] || {};

      return {
        objectID: product._id.toString(),
        name: description.name || '',
        description: description.description || '',
        category: product.category_id?.toString() || '',
        brand: product.brand || '',
        price: product.price || 0,
        images: product.images?.map((img) => img.url) || [],
        seller: product.seller || '',
        tags: product.tags || [],
        popularity: product.popularity || 0,
        price_range: getPriceRange(product.price),
        status: product.status,
        product_id: product.product_id,
        unified_sku: product.unified_sku,
        condition: product.condition,
        type: product.type,
        createdAt: product.createdAt,
      };
    });

    const { objectIDs } = await index.saveObjects(algoliaProducts);
    console.log(`✅ Successfully synced ${objectIDs.length} products to Algolia`);

    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error syncing products:', error);
  }
}

syncProducts();
