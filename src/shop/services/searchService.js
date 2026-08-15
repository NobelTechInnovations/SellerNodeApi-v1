import BaseService from './baseService.js';
import Product from '../../models/products/product.js';
import ProductDescription from '../../models/products/productDescription.js';
import Category from '../../models/products/category.js';
import categoryService from './categoryService.js';
import biddingService from './biddingService.js';

const MAX_CANDIDATES = 200;

class SearchService extends BaseService {
    /**
     * Backend-owned, fully-tracked product search (Phase 4, M4 — the
     * "hybrid" half of the search decision: Algolia stays for the live
     * typeahead dropdown, THIS is what powers the real results page and
     * everything search-intelligence-related, because the backend needs to
     * actually see what was searched, what was shown, and in what order to
     * build keyword volume/CTR/no-result reports later.
     *
     * Ranking: MongoDB text-search relevance score on ProductDescription
     * (title weighted highest, then meta_details, then description) is the
     * primary signal, with brand-name and category-name matches appended as
     * a fallback for queries that don't hit any indexed text field (e.g.
     * "Samsung" alone). Deduplicated, capped at MAX_CANDIDATES before
     * pagination — enough to paginate through without scanning the whole
     * catalog on every keystroke-adjacent request.
     */
    async searchProducts({ q, lat, lng, page, limit, minPrice, maxPrice, brand, includeOutOfRange }) {
        return await this.handleDBOperation(async () => {
            const query = (q || '').trim();
            if (!query) {
                return { products: [], result_count: 0, facets: { brands: [] }, query: '' };
            }

            // 1. Text-search relevance (primary signal).
            const textMatches = await ProductDescription.find(
                { $text: { $search: query } },
                { product_id: 1, score: { $meta: 'textScore' } }
            ).sort({ score: { $meta: 'textScore' } }).limit(MAX_CANDIDATES).lean();

            const orderedIds = textMatches.map((m) => m.product_id);
            const seen = new Set(orderedIds);

            // 2. Brand-name fallback — catches queries like "Samsung" that
            // won't hit the title/description text index at all.
            if (orderedIds.length < MAX_CANDIDATES) {
                const brandMatches = await Product.find(
                    { brand: { $regex: query, $options: 'i' }, status: 'published' },
                    { product_id: 1 }
                ).limit(MAX_CANDIDATES - orderedIds.length).lean();
                for (const p of brandMatches) {
                    if (!seen.has(p.product_id)) { seen.add(p.product_id); orderedIds.push(p.product_id); }
                }
            }

            // 3. Category-name fallback — a query matching a category name
            // (e.g. "electronics") surfaces that category's products too.
            if (orderedIds.length < MAX_CANDIDATES) {
                const matchingCategories = await Category.find({ name: { $regex: query, $options: 'i' } }, { _id: 1 }).lean();
                for (const cat of matchingCategories) {
                    if (orderedIds.length >= MAX_CANDIDATES) break;
                    const categoryIds = await categoryService.getAllChildCategoryIds(cat._id);
                    const categoryProducts = await Product.find(
                        { category_id: { $in: categoryIds }, status: 'published' },
                        { product_id: 1 }
                    ).limit(MAX_CANDIDATES - orderedIds.length).lean();
                    for (const p of categoryProducts) {
                        if (!seen.has(p.product_id)) { seen.add(p.product_id); orderedIds.push(p.product_id); }
                    }
                }
            }

            const resultCount = orderedIds.length;
            if (resultCount === 0) {
                return { products: [], result_count: 0, facets: { brands: [] }, query };
            }

            // Paginate the candidate id list BEFORE hydrating — avoids
            // fetching full product/price/image data for ids that won't
            // even be shown on this page.
            const pageNum = Math.max(parseInt(page, 10) || 1, 1);
            const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
            const pageIds = orderedIds.slice((pageNum - 1) * pageLimit, pageNum * pageLimit);

            const hydrated = await categoryService.hydrateProductsByIds(pageIds, { lat, lng });

            // Post-filter by brand/price on the (small, already-paginated)
            // hydrated set — consistent with how category browsing filters,
            // acceptable here since search result pages are capped small.
            let products = hydrated;
            if (brand) {
                const brands = String(brand).split(',').map((b) => b.trim().toLowerCase()).filter(Boolean);
                products = products.filter((p) => brands.includes((p.brand || '').toLowerCase()));
            }
            const minPriceNum = minPrice != null && minPrice !== '' ? Number(minPrice) : null;
            const maxPriceNum = maxPrice != null && maxPrice !== '' ? Number(maxPrice) : null;
            if (minPriceNum != null || maxPriceNum != null) {
                products = products.filter((p) => {
                    const price = p.price?.selling_price?.$numberDecimal ?? p.price?.selling_price ?? p.price?.$numberDecimal ?? p.price;
                    const num = price != null ? Number(price) : null;
                    if (num == null) return false;
                    if (minPriceNum != null && num < minPriceNum) return false;
                    if (maxPriceNum != null && num > maxPriceNum) return false;
                    return true;
                });
            }

            const availableBrands = [...new Set(hydrated.map((p) => p.brand).filter(Boolean))];

            // Sponsored ranking boost (Phase 4, M5) — only re-orders within
            // this already-relevant, already-paginated set; a bid can never
            // pull in an irrelevant product that didn't match the search.
            products = await biddingService.applyBidBoost(products, query);

            return { products, result_count: resultCount, facets: { brands: availableBrands }, query };
        });
    }
}

export default new SearchService();
