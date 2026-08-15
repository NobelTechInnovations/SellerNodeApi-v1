import BaseService from './baseService.js';
import Category from '../../models/products/category.js';
import categoryService from './categoryService.js';
import behaviorProfileService from './behaviorProfileService.js';

const PRODUCTS_PER_SECTION = 10;
const MAX_SECTIONS = 4;

class HomeFeedService extends BaseService {
    /**
     * Fetch products for a category (and its descendants), reusing the
     * same filter/geo pipeline categoryItems uses, so home-feed sections
     * respect the buyer's location exactly like category browsing does.
     */
    async _fetchCategoryProducts(categoryId, { lat, lng }) {
        const categoryIds = await categoryService.getAllChildCategoryIds(categoryId);
        const { flattenedProducts } = await categoryService._queryFilteredProducts({
            categoryIds, lat, lng, limit: PRODUCTS_PER_SECTION,
        });
        return flattenedProducts;
    }

    /**
     * Cold-start sections shown to everyone by default: a handful of root
     * categories with their current published products. This is what a
     * brand-new visitor (or anyone whose behaviorProfileService confidence
     * tier is 'cold' — see PERSONALIZATION_BLEND) always sees; it's also
     * the fallback fill-in when personalization has fewer than
     * MAX_SECTIONS categories worth of signal.
     */
    async _getDefaultSections({ lat, lng }, excludeCategoryIds = []) {
        const excludeSet = new Set(excludeCategoryIds.map((id) => id.toString()));
        const rootCategories = await Category.find({ parent: null })
            .sort({ createdAt: -1 })
            .lean();

        const sections = [];
        for (const category of rootCategories) {
            if (sections.length >= MAX_SECTIONS) break;
            if (excludeSet.has(category._id.toString())) continue;

            const products = await this._fetchCategoryProducts(category._id, { lat, lng });
            if (products.length > 0) {
                sections.push({
                    title: `Best of ${category.name}`,
                    category_id: category._id,
                    category_slug: category.slug,
                    type: 'default',
                    products,
                });
            }
        }
        return sections;
    }

    /**
     * The buyer's home feed. Uses behaviorProfileService's graduated
     * confidence tier (Phase 4) instead of a binary "3+ events or nothing"
     * cutoff — a cold profile gets 0 personalized slots, and even a
     * 'strong' profile keeps at least one default/trending slot rather
     * than fully committing to personalization off any single signal.
     * Every section still respects buyer geo-filtering exactly like
     * category browsing (Phase 1) does.
     */
    async getHomeFeed({ customerId, anonId, lat, lng }) {
        return await this.handleDBOperation(async () => {
            const profile = await behaviorProfileService.getUserAffinityProfile({ customerId, anonId });
            const numPersonalizedSlots = Math.round(MAX_SECTIONS * profile.personalizedBlend);
            const topCategoryIds = profile.categoryAffinity.slice(0, numPersonalizedSlots).map((c) => c.category_id);

            const sections = [];
            for (const categoryId of topCategoryIds) {
                const category = await Category.findById(categoryId).lean();
                if (!category) continue;

                const products = await this._fetchCategoryProducts(categoryId, { lat, lng });
                if (products.length > 0) {
                    sections.push({
                        title: `Because you viewed ${category.name}`,
                        category_id: category._id,
                        category_slug: category.slug,
                        type: 'personalized',
                        products,
                    });
                }
            }

            if (sections.length < MAX_SECTIONS) {
                const fillerSections = await this._getDefaultSections(
                    { lat, lng },
                    sections.map((s) => s.category_id)
                );
                sections.push(...fillerSections.slice(0, MAX_SECTIONS - sections.length));
            }

            return {
                sections,
                personalized: sections.some((s) => s.type === 'personalized'),
                confidence: profile.confidence,
            };
        });
    }
}

export default new HomeFeedService();
