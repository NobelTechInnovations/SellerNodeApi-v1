import { catchAsync } from '../../utils/index.js';
import BaseController from '../baseController.js';
import categoryService from '../../services/categoryService.js';
import Product from '../../../models/products/product.js';
import ProductPrice from '../../../models/products/productPrice.js';
import ProductCombination from '../../../models/products/productCombination.js';
import ProductImage from '../../../models/products/productImage.js';
import ProductDescription from '../../../models/products/productDescription.js';
import ProductMeta from '../../../models/products/productMeta.js';
import SellerBusinessDetails from '../../../models/users/sellerBusinessDetails.js';
import SellerWarehouse from '../../../models/users/sellerWarehouse.js';
import User from '../../../models/users/user.js';
import ProductSellerSku from '../../../models/products/productSellerSku.js';

class ProductController extends BaseController {
    constructor() {
        super();
        // Bind methods to preserve 'this' context
        this.productListingInfo = this.productListingInfo.bind(this);
        this.productListingImages = this.productListingImages.bind(this);
    }

    productListingInfo = catchAsync(async (req, res) => {
        const { gspin } = req.params;  // gspin is product_id from URL
        const { pid, p_sku, type } = req.query;  // query parameters - pid is not used for product lookup

        let productQuery = {};
        
        // Always use gspin (product_id) to find the product as it's mandatory
        productQuery.product_id = gspin; 

        const product = await Product.findOne(productQuery)
            .populate('category_id' )
            .lean();

        if (!product) {
            return this.sendError(res, 'Product not found', 404);
        }

        // Get product description
        const description = await ProductDescription.findOne({ 
            product_id: product.product_id 
        }).lean();

        // Get product meta details
        const metaDetails = await ProductMeta.findOne({ 
            product_id: product.product_id 
        }).lean();

        // Get product seller SKU details
        const productSellerSku = await ProductSellerSku.findOne({
            product_id: product.product_id
        }).lean();

        // Get seller details from User model
        const seller = await User.findById(productSellerSku?.seller_id).lean();

        // Get seller business details
        const sellerBusiness = await SellerBusinessDetails.findOne({
            seller_id: seller?._id
        }).select('seller_id business_name business_address pincode location').lean();

        // Get seller warehouse details
        const sellerWarehouses = await SellerWarehouse.find({
            seller_id: seller?._id,
            deleted_at: null
        }).lean();

        // Base product details
        let productDetails = {
            ...product,
            title: description?.title || '',  // Move title to main level
            description: {
                ...description,
                title: undefined  // Remove title from description object
            },
            meta: metaDetails || null,
            price: null,
            sku: null,
            selected_combination: null,  // Will hold the selected combination details
            variations: null,
            seller: {
                _id: seller?._id,
                name: seller?.name,
                email: seller?.email,
                business: sellerBusiness || null,
                warehouses: sellerWarehouses || []
            }
        };

        if (type === 'simple') {
            const price = await ProductPrice.findOne({ product_id: product.product_id });
            if (price) {
                productDetails.price = price;
                productDetails.sku = product.unified_sku;
            }
        } else if (type === 'variable_combination') {
            // Get all combinations for this product
            const combinations = await ProductCombination.find({
                product_id: gspin
            }).lean();

            
            // Format variations for each combination - only include variant details
            const variations = combinations.map(combination => ({
                product_id: combination.product_id,
                sku: combination.sku,
                variant: combination.variant,
                stock: combination.stock,
                image: combination.imageUrl
            }));
            
            productDetails.variations = variations;

            // If specific SKU is requested, find and set its details

            if (p_sku) {

                // Perform case-insensitive comparison for SKU
                const selectedCombination = combinations.find(c => c.sku.toLowerCase() === p_sku.toLowerCase());
                if (selectedCombination) {
                     // Build variation text for title
                    let variationText = '';
                    if (selectedCombination.variant) {
                        variationText = Object.values(selectedCombination.variant)
                            .map(v => v.value)
                            .join(', ');
                    }
                    // Set selected combination details
                    productDetails.selected_combination = {
                        sku: selectedCombination.sku,
                        variant: selectedCombination.variant,
                        stock: selectedCombination.stock,
                        imageUrl: selectedCombination.imageUrl,
                        price: selectedCombination.price 
                    };

                    // Update main product details with selected combination
                    productDetails.price = { selling_price: selectedCombination.price };
                    productDetails.sku = selectedCombination.sku;

                    // Update title with variation text
                    productDetails.title = variationText
                        ? `${description?.title || ''} (${variationText})`
                        : description?.title;
                }
            }
        }

        return this.sendResponse(res, productDetails);
    });
   
    productListingImages = catchAsync(async (req, res) => {
        const { gspin } = req.params;  // gspin is product_id from URL
        const { pid, type, p_sku } = req.query;  // query parameters - pid is not used for product lookup

        let productQuery = {};

        // Always use gspin (product_id) to find the product as it's mandatory
        productQuery.product_id = gspin;

        const product = await Product.findOne(productQuery);
        if (!product) {
            return this.sendError(res, 'Product not found', 404);
        }

        // Get base product images (thumbnail and gallery)
        const productImagesData = await ProductImage.findOne({ product_id: product.product_id })
            .select('thumbnail_image gallery_images')
            .lean();

        let images = [];
        let primaryImageUrl = null;
        let galleryImageUrls = [];

        // Always include base product gallery images if they exist
        if (productImagesData?.gallery_images && Array.isArray(productImagesData.gallery_images)) {
            galleryImageUrls = galleryImageUrls.concat(productImagesData.gallery_images);
        }

        if (type === 'variable_combination' && p_sku) {
            // For variable products with specific SKU, try to get combination images
            // Perform case-insensitive comparison for SKU
            const combination = await ProductCombination.findOne({
                product_id: product.product_id,
                sku: p_sku.toLowerCase() // Use lower case for search in DB
            }).lean();

            if (combination && combination.imageUrl && Array.isArray(combination.imageUrl) && combination.imageUrl.length > 0) {
                // If combination has specific images:
                // First combination image is primary
                primaryImageUrl = combination.imageUrl[0];
                // Rest of combination images are part of gallery
                galleryImageUrls = combination.imageUrl.slice(1).concat(galleryImageUrls);
            } else {
                // If no combination images, use product thumbnail as primary
                primaryImageUrl = productImagesData?.thumbnail_image;
            }
        } else {
            // For simple products or variable without specific SKU, use product thumbnail as primary
            primaryImageUrl = productImagesData?.thumbnail_image;
        }

        // Construct the final images array
        if (primaryImageUrl) {
            images.push({ url: primaryImageUrl, is_primary: true });
        }

        images = images.concat(galleryImageUrls.map(url => ({
            url,
            is_primary: false
        })));

        return this.sendResponse(res, images);
    });
}

export default new ProductController();