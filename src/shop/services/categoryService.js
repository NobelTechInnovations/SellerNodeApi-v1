import Category from '../../models/products/category.js';
import product from '../../models/products/product.js';
import ProductPrice from '../../models/products/productPrice.js';
import BaseService from './baseService.js';
import ProductVariation from '../../models/products/productVariation.js';
import ProductCombination from '../../models/products/productCombination.js';


class CategoryService extends BaseService {
    constructor() {
        super();
    }

    // Recursive function to get child categories in tree format
    async getChildCategories(parentId, limit = 8) {
        const children = await Category.find({ parent: parentId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        
        for (let child of children) {
            child.children = await this.getChildCategories(child._id, limit);
        }
        
        return children;
    }

    async categoryListing(query, limit) {
        return await this.handleDBOperation(async () => {
            const { tree, 'main-category': mainCategory } = query;

            // If main-category is empty, get all parent categories
            if (!mainCategory) {
                const parentCategories = await Category.find({ parent: null })
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .lean();

                // If tree parameter is true, get child categories for each parent
                if (tree === 'true') {
                    for (let category of parentCategories) {
                        category.children = await this.getChildCategories(category._id, limit);
                    }
                }

                return parentCategories;
            }

            // If main-category has an ID
            const mainCat = await Category.findById(mainCategory).lean();
            if (!mainCat) {
                throw new Error('Main category not found');
            }

            // Get immediate child categories
            const childCategories = await Category.find({ parent: mainCategory })
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            // If tree parameter is true, get the complete hierarchy
            if (tree === 'true') {
                // Get parent hierarchy
                const parentHierarchy = [];
                let currentCat = mainCat;
                while (currentCat.parent) {
                    currentCat = await Category.findById(currentCat.parent).lean();
                    if (currentCat) {
                        parentHierarchy.unshift(currentCat);
                    }
                }

                // Get child hierarchy
                for (let category of childCategories) {
                    category.children = await this.getChildCategories(category._id, limit);
                }

                return {
                    parents: parentHierarchy,
                    current: mainCat,
                    children: childCategories
                };
            }

            return childCategories;
        });
    }


    async categoryItems(categoryId) {
        return await this.handleDBOperation(async () => {
            // First get the main category
            const mainCategory = await Category.findById(categoryId).lean();
            if (!mainCategory) {
                throw new Error('Category not found');
            }

            // Get all child category IDs recursively
            const getAllChildCategoryIds = async (parentId) => {
                const childCategories = await Category.find({ parent: parentId }).lean();
                let categoryIds = [parentId];
                
                for (const child of childCategories) {
                    const childIds = await getAllChildCategoryIds(child._id);
                    categoryIds = [...categoryIds, ...childIds];
                }
                
                return categoryIds;
            };

            // Get all category IDs (main + children)
            const allCategoryIds = await getAllChildCategoryIds(categoryId);

            // Get products from all categories
            const products = await product.find({
                status: 'published',
                category_id: { $in: allCategoryIds }
            })
            .populate('category_id','name slug parent')
            .populate('images', 'thumbnail_image gallery_images')
            .populate('descriptions', 'title description')
            .lean();

            if (!products || products.length === 0) {
                return {
                    category: mainCategory,
                    products: []
                };
            }

            const productIds = products.map(p => p.product_id);
            // Fetch all prices for those product_ids
            const prices = await ProductPrice.find({ product_id: { $in: productIds } }).lean();
            
            // Create a price map
            const priceMap = {};
            prices.forEach(price => {
                priceMap[price.product_id] = price;
            });
            
            // Merge price into products
            const productsWithPrices = products.map(product => ({
                ...product,
                price: priceMap[product.product_id] || null
            }));

            // if prodfuct is  "type": "variable",
            // then get all price for that product from procut combniation table 
            for (let product of productsWithPrices) {
                if (product.type === 'variable') {
                    // Get variations
                    const variation = await ProductVariation.findOne({ product_id: product.product_id }).lean();
                    product.variations = variation ? variation.attributes : [];
                    // Get combinations (each combination is a variant with its own price/stock/sku)
                    const combinations = await ProductCombination.find({ product_id: product.product_id }).lean();
                    product.combinations = combinations;
                }
            }

            return {
                category: mainCategory,
                products: productsWithPrices
            };
        });
    }


}

export default new CategoryService();