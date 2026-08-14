import Category from '../../models/products/category.js';
import product from '../../models/products/product.js';
import ProductPrice from '../../models/products/productPrice.js';
import BaseService from './baseService.js';
import ProductVariation from '../../models/products/productVariation.js';
import ProductCombination from '../../models/products/productCombination.js';
import { getEligibleProductIdsForLocation } from './geoService.js';

// A Decimal128 field comes back from .lean() as either a plain number/string
// or a `{ $numberDecimal: "123.45" }` object depending on the mongoose
// version/path it went through — normalize both to a JS number.
function toNumberPrice(value) {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value.$numberDecimal !== undefined) {
        return parseFloat(value.$numberDecimal);
    }
    return parseFloat(value);
}

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

    // Recursive function to get all child category IDs
    async getAllChildCategoryIds(parentId) {
        const childCategories = await Category.find({ parent: parentId }).lean();
        let categoryIds = [parentId];

        for (const child of childCategories) {
            const childIds = await this.getAllChildCategoryIds(child._id);
            categoryIds = [...categoryIds, ...childIds];
        }

        return categoryIds;
    };

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

    /**
     * Shared filter-building + product-flattening logic used by both
     * categoryItems (category-scoped) and nearbyProducts (unscoped).
     * `categoryIds` may be null for an unscoped "all categories" query.
     */
    async _queryFilteredProducts({ categoryIds, lat, lng, minPrice, maxPrice, brand, page, limit }) {
        const productQuery = { status: 'published' };
        if (categoryIds) {
            productQuery.category_id = { $in: categoryIds };
        }

        if (brand) {
            const brands = String(brand).split(',').map((b) => b.trim()).filter(Boolean);
            if (brands.length > 0) productQuery.brand = { $in: brands };
        }

        // Geo filter: only applied when a buyer location was supplied.
        // Absent lat/lng -> skip filtering entirely (keeps dev/testing and
        // any not-yet-located caller usable rather than hard-failing).
        if (lat != null && lng != null) {
            const eligibleProductIds = await getEligibleProductIdsForLocation(lat, lng);
            if (eligibleProductIds !== null) {
                productQuery.product_id = { $in: eligibleProductIds };
            }
        }

        let productsQuery = product.find(productQuery)
            .populate('category_id', 'name slug parent')
            .populate('images', 'thumbnail_image gallery_images')
            .populate('descriptions', 'title description');

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 0, 0), 200); // 0 = unlimited (back-compat)
        if (pageLimit > 0) {
            productsQuery = productsQuery.skip((pageNum - 1) * pageLimit).limit(pageLimit);
        }

        const products = await productsQuery.lean();

        // Brand facet (cheap, category-scoped distinct) for filter UI options.
        const brandFacetQuery = { status: 'published' };
        if (categoryIds) brandFacetQuery.category_id = { $in: categoryIds };
        const availableBrands = await product.distinct('brand', brandFacetQuery);

        if (!products || products.length === 0) {
            return { flattenedProducts: [], availableBrands: availableBrands.filter(Boolean) };
        }

        // Fetch all prices for simple products
        const simpleProductIds = products.filter(p => p.type !== 'variable').map(p => p.product_id);
        const simplePrices = await ProductPrice.find({ product_id: { $in: simpleProductIds } }).lean();
        const simplePriceMap = {};
        simplePrices.forEach(price => {
            simplePriceMap[price.product_id] = price;
        });

        const minPriceNum = minPrice != null && minPrice !== '' ? Number(minPrice) : null;
        const maxPriceNum = maxPrice != null && maxPrice !== '' ? Number(maxPrice) : null;
        const withinPriceRange = (priceNum) => {
            if (priceNum == null) return minPriceNum == null && maxPriceNum == null; // no price data -> only include if no price filter requested
            if (minPriceNum != null && priceNum < minPriceNum) return false;
            if (maxPriceNum != null && priceNum > maxPriceNum) return false;
            return true;
        };

        const flattenedProducts = [];
        for (const p of products) {
            const productTitle = p.descriptions && p.descriptions[0] ? p.descriptions[0].title : p.product_id;
            if (p.type === 'variable') {
                const combinations = await ProductCombination.find({ product_id: p.product_id }).lean();
                for (const combination of combinations) {
                    const combinationPrice = toNumberPrice(combination.price);
                    if (!withinPriceRange(combinationPrice)) continue;

                    let variationText = '';
                    if (combination.variant) {
                        variationText = Object.values(combination.variant)
                            .map(v => v.value)
                            .join(', ');
                    }
                    const title = variationText
                        ? `${productTitle} (${variationText})`
                        : productTitle;
                    flattenedProducts.push({
                        ...p,
                        price: combination.price,
                        stock: combination.stock,
                        images: [{ thumbnail_image: combination.imageUrl && combination.imageUrl[0] ? combination.imageUrl[0] : (p.images && p.images[0] ? p.images[0].thumbnail_image : null), gallery_images: combination.imageUrl || [] }],
                        sku: combination.sku,
                        title,
                        selected_variation: combination.variant,
                        parent_product_id: p.product_id,
                        type: 'variable_combination',
                        descriptions: undefined
                    });
                }
            } else {
                const priceDoc = simplePriceMap[p.product_id] || null;
                const sellingPrice = priceDoc ? toNumberPrice(priceDoc.selling_price) : null;
                if (!withinPriceRange(sellingPrice)) continue;

                flattenedProducts.push({
                    ...p,
                    price: priceDoc,
                    sku: p.unified_sku,
                    title: productTitle,
                    descriptions: undefined
                });
            }
        }

        return { flattenedProducts, availableBrands: availableBrands.filter(Boolean) };
    }

    async categoryItems(categoryId, queryParams = {}) {
        return await this.handleDBOperation(async () => {
            const { lat, lng, minPrice, maxPrice, brand, subcategory, page, limit } = queryParams;

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
            let allCategoryIds = await getAllChildCategoryIds(categoryId);

            // Subcategory filter: narrow to the requested subset, but only
            // ids that are actually within this category's own tree (a
            // caller can't use it to leak products from other branches).
            if (subcategory) {
                const requested = String(subcategory).split(',').map((s) => s.trim()).filter(Boolean);
                const allIdSet = new Set(allCategoryIds.map((id) => id.toString()));
                const validRequested = requested.filter((id) => allIdSet.has(id));
                if (validRequested.length > 0) {
                    allCategoryIds = validRequested;
                }
            }

            const { flattenedProducts, availableBrands } = await this._queryFilteredProducts({
                categoryIds: allCategoryIds, lat, lng, minPrice, maxPrice, brand, page, limit
            });

            if (flattenedProducts.length === 0) {
                return {
                    category: mainCategory,
                    products: [],
                    facets: { brands: availableBrands }
                };
            }

            // Build category tree (ancestors from root to current)
            let categoryTree = [];
            if (mainCategory.ancestors && mainCategory.ancestors.length > 0) {
                // If ancestors array is present, fetch all ancestors and append current
                categoryTree = await Category.find({ _id: { $in: [...mainCategory.ancestors, mainCategory._id] } })
                    .sort({ createdAt: 1 }) // Optional: sort by creation or custom order
                    .lean();
                // Ensure order is root to current
                const idOrder = [...mainCategory.ancestors.map(id => id.toString()), mainCategory._id.toString()];
                categoryTree.sort((a, b) => idOrder.indexOf(a._id.toString()) - idOrder.indexOf(b._id.toString()));
            } else {
                // Fallback: walk up the parent chain
                let currentCat = mainCategory;
                while (currentCat) {
                    categoryTree.unshift(currentCat);
                    if (!currentCat.parent) break;
                    currentCat = await Category.findById(currentCat.parent).lean();
                }
            }

            // Find root parent
            const rootCategory = categoryTree.length > 0 ? categoryTree[0] : mainCategory;
            // Get all direct children of root
            const rootChildren = await Category.find({ parent: rootCategory._id }).lean();

            // Prepare root category with its children
            const rootCategoryWithChildren = {
                ...rootCategory,
                children: rootChildren
            };

            return {
                category: mainCategory,
                products: flattenedProducts,
                category_tree: categoryTree,
                root_category_with_children: rootCategoryWithChildren,
                facets: { brands: availableBrands }
            };
        });
    }

    /**
     * Unscoped product listing (no mandatory category) — same geo/price/brand
     * filters as categoryItems, with an optional `category` param instead of
     * a route-level category id. Groundwork for a future "products near you"
     * home-page section.
     */
    async nearbyProducts(queryParams = {}) {
        return await this.handleDBOperation(async () => {
            const { lat, lng, minPrice, maxPrice, brand, category, page, limit } = queryParams;

            let categoryIds = null;
            if (category) {
                const requested = String(category).split(',').map((s) => s.trim()).filter(Boolean);
                categoryIds = [];
                for (const catId of requested) {
                    categoryIds = categoryIds.concat(await this.getAllChildCategoryIds(catId));
                }
            }

            const { flattenedProducts, availableBrands } = await this._queryFilteredProducts({
                categoryIds, lat, lng, minPrice, maxPrice, brand, page, limit
            });

            return {
                products: flattenedProducts,
                facets: { brands: availableBrands }
            };
        });
    }

    async getRecommendedProducts(categoryId, itemId) {
        return await this.handleDBOperation(async () => {
            if (!categoryId) {
                throw new Error('Category ID is required for recommended products');
            }

            // Get all child category IDs recursively, including the current category
            const getAllChildCategoryIds = async (parentId) => {
                const childCategories = await Category.find({ parent: parentId }).lean();
                let categoryIds = [parentId];

                for (const child of childCategories) {
                    const childIds = await this.getAllChildCategoryIds(child._id);
                    categoryIds = [...categoryIds, ...childIds];
                }

                return categoryIds;
            };

            const allCategoryIds = await getAllChildCategoryIds(categoryId);

            // Get products from the category and its children, excluding the current item
            const products = await product.find({
                status: 'published',
                category_id: { $in: allCategoryIds },
                _id: { $ne: itemId } // Exclude the current item
            })
            .populate('category_id','name slug parent')
            .populate('images', 'thumbnail_image gallery_images')
            .populate('descriptions', 'title description')
            .lean();

             if (!products || products.length === 0) {
                return [];
            }

            // Fetch all prices for simple products
            const simpleProductIds = products.filter(p => p.type !== 'variable').map(p => p.product_id);
            const simplePrices = await ProductPrice.find({ product_id: { $in: simpleProductIds } }).lean();
            const simplePriceMap = {};
            simplePrices.forEach(price => {
                simplePriceMap[price.product_id] = price;
            });

            const flattenedProducts = [];
            for (const product of products) {
                // Extract title from descriptions
                const productTitle = product.descriptions && product.descriptions[0] ? product.descriptions[0].title : product.product_id;
                if (product.type === 'variable') {
                    // Get variations and combinations
                    const variation = await ProductVariation.findOne({ product_id: product.product_id }).lean();
                    const combinations = await ProductCombination.find({ product_id: product.product_id }).lean();
                    // For each combination, create a separate product entry
                    for (const combination of combinations) {
                        // Build a readable title from combination attributes
                        let variationText = '';
                        if (combination.variant) {
                            variationText = Object.values(combination.variant)
                                .map(v => v.value)
                                .join(', ');
                        }
                        const title = variationText
                            ? `${productTitle} (${variationText})`
                            : productTitle;
                        flattenedProducts.push({
                            ...product,
                            // Overwrite fields with combination-specific data
                            price: combination.price,
                            stock: combination.stock,
                            images: [{ thumbnail_image: combination.imageUrl && combination.imageUrl[0] ? combination.imageUrl[0] : (product.images && product.images[0] ? product.images[0].thumbnail_image : null), gallery_images: combination.imageUrl || [] }],
                            sku: combination.sku,
                            title,
                            selected_variation: combination.variant,
                            parent_product_id: product.product_id,
                            type: 'variable_combination',
                            // Remove variations/combinations fields for flattened
                            descriptions: undefined // Remove descriptions for clarity
                        });
                    }
                } else {
                    // Simple product, attach price and title, remove descriptions
                    flattenedProducts.push({
                        ...product,
                        price: simplePriceMap[product.product_id] || null,
                        sku:product.unified_sku,
                        title: productTitle,
                        descriptions: undefined // Remove descriptions for clarity
                    });
                }
            }

            // You might want to add logic here to select a limited number of recommended products
            // and perhaps ensure diversity (e.g., limit per subcategory).

            return flattenedProducts; // Return the list of recommended products
        });
    }


}

export default new CategoryService();
