import dotenv from 'dotenv';
import mongoose from 'mongoose';
import algoliasearch from 'algoliasearch/lite.js'; // 👈 THIS IS THE KEY FIX
import Product from '../models/products/product.js';

dotenv.config();

const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_API_KEY);
const index = client.initIndex('products');

const testData = [
  { objectID: '1', name: 'Product A' },
  { objectID: '2', name: 'Product B' },
];

index.saveObjects(testData)
  .then(() => console.log('✅ Data indexed successfully'))
  .catch((err) => console.error('❌ Error indexing data:', err));
