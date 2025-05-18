import mongoose from 'mongoose';
import Product from '../../models/products/product.js';
import Images from '../../models/products/productImage.js';
import Titles from '../../models/products/productDescription.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import slugify from 'slugify'; 
import ProductSellerSKU from '../../models/products/productSellerSku.js';
import crypto from 'crypto';
import { uploadToS3 } from '../../utils/s3Service.js';
import { upload } from '../../middleware/upload.js';
import Category from '../../models/products/category.js';
import CategoryAttribute from '../../models/products/categoryAttribute.js';
import Attribute from '../../models/products/attribute.js';
import AttributeOption from '../../models/products/attributeOption.js';
import ProductMeta from '../../models/products/productMeta.js';
import ProductVariation from '../../models/products/productVariation.js';
import ProductCombination from '../../models/products/productCombination.js';
import ProductPrice from '../../models/products/productPrice.js';

    // Create product with transaction
    export const createProduct = async (req, res) => {
        console.log(req.body);
        let session;
        try {
            // Start MongoDB session
            session = await mongoose.startSession();
            session.startTransaction();

            // Parse the 'product', 'title' and 'images' fields from the request body
            const product = typeof req.body.product === 'string' ? JSON.parse(req.body.product) : req.body.product;
            const title = typeof req.body.title === 'string' ? JSON.parse(req.body.title) : req.body.title;
            const images = req.body.images || [];

            if (!product || !title) {
                return sendError(res, 'Missing required product or title data', null, 400);
            }

            product.slug = await generateUniqueSlug(title.title || 'product');
            product.slug_hash = generateSlugHash(product.slug);
            
            // Create product within transaction
            const [createdProduct] = await Product.create([product], { session });

            const productImages = {
                product_id: createdProduct.product_id,
                thumbnail_image: images[0] || null,
                gallery_images: images.slice(1)
            };
            await Images.create([productImages], { session });

            // Assign title
            title.product_id = createdProduct.product_id;
            await Titles.create([{
                product_id: createdProduct.product_id,
                title: title.title,
                description: title.description,
                language: 'en'
            }], { session });

            // Assign product to seller
            const sellerSku = {
                product_id: createdProduct.product_id,
                seller_id: req.user._id
            };
            await ProductSellerSKU.create([sellerSku], { session });
            await session.commitTransaction();
            
            return sendSuccess(res, 'Product created successfully', { product: {
                _id: createdProduct._id,
                product_id: createdProduct.product_id,
                unified_sku: createdProduct.unified_sku
            } });

        } catch (err) {
            // If any error occurs, abort the transaction
            if (session) {
                await session.abortTransaction();
            }
            return sendError(res, 'Failed to create product', err.message, 422);
        } finally {
            // End the session
            if (session) {
                await session.endSession();
            }
        }
    };

    async function generateUniqueSlug(title) {
        const baseSlug = slugify(title, { lower: true, strict: true });
        let slug = baseSlug;
        let count = 1;

        while (await Product.findOne({ slug })) {
            slug = `${baseSlug}_${count}`;
            count++;
        }

        return slug;
    }
    function generateSlugHash(title) {
        return crypto.createHash('md5').update(title + Date.now()).digest('hex');
    }
  

    export const getAllProducts = async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const sellerId = req.user?._id;
    
            if (!sellerId) {
                return sendError(res, 'Unauthorized: seller ID not found in token', '', 401);
            }
    
            // First get all product IDs for this seller
            const sellerSkus = await ProductSellerSKU.find({ seller_id: sellerId })
                .select('product_id')
                .lean();
    
            const productIds = sellerSkus.map(sku => sku.product_id);
    
            // Then fetch products with populated data
            const products = await Product.find({ 
                product_id: { $in: productIds },
                deleted_at: null 
            })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('category_id', 'name')
            .populate({
                path: 'images',
                select: 'thumbnail_image',
                model: 'ProductImage'
            })
            .populate({
                path: 'descriptions',
                match: { language: 'en' },
                select: 'title',
                model: 'ProductDescription'
            })
            .lean();
    
            // Get total count for pagination
            const total = await Product.countDocuments({ 
                product_id: { $in: productIds },
                deleted_at: null 
            });
    
            return sendSuccess(res, 'Products retrieved successfully', {
                products,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            });
    
        } catch (err) {
            console.error(err);
            return sendError(res, 'Failed to retrieve products', err.message, 400);
        }
    };

     // Update product with transaction
    export const updateProduct = async (req, res) => {
        let session;
        try {
            session = await mongoose.startSession();
            session.startTransaction();

            const { product, title, images } = req.body;
            const productId = req.params.product_id;

            if (!productId) {
                return sendError(res, 'Product ID is required', null, 400);
            }

            // Update the product
            const updatedProduct = await Product.findOneAndUpdate(
                { product_id: productId },
                { ...product },
                { session }
            );

            if (!updatedProduct) {
                await session.abortTransaction();
                return sendError(res, 'Product not found', {}, 404);
            }

            // Update images if provided
            if (images && Array.isArray(images)) {
                await Images.findOneAndUpdate(
                    { product_id: productId },
                    { 
                        thumbnail_image: images[0] || updatedProduct.thumbnail_image,
                        gallery_images: images.slice(1)
                    },
                    { new: true, session, upsert: true }
                );
            }

            // Update title if provided
            if (title) {
                await Titles.findOneAndUpdate(
                    { product_id: productId },
                    { 
                        title: title.title,
                        description: title.description,
                        language: 'en'
                    },
                    { new: true, session, upsert: true }
                );
            }

            await session.commitTransaction();
            return sendSuccess(res, 'Product updated successfully', { product: updatedProduct });
        } catch (err) {
            if (session) {
                await session.abortTransaction();
            }
            return sendError(res, 'Failed to update product', err.message, 400);
        } finally {
            if (session) {
                await session.endSession();
            }
        }
    };

    // Delete product (soft delete)
    export const deleteProduct = async (req, res) => {
        let session;
        try {
            session = await mongoose.startSession();
            session.startTransaction();

            const product = await Product.findOneAndUpdate(
                { product_id: req.params.product_id },
                { deleted_at: new Date() },
                { new: true, session }
            );

            if (!product) {
                await session.abortTransaction();
                return sendError(res, 'Product not found', {}, 404);
            }

            await session.commitTransaction();
            return sendSuccess(res, 'Product deleted successfully');
        } catch (err) {
            if (session) {
                await session.abortTransaction();
            }
            return sendError(res, 'Failed to delete product', err.message, 400);
        } finally {
            if (session) {
                await session.endSession();
            }
        }
    };

    // Update product status
    export const updateProductStatus = async (req, res) => {
        try {
            const { status } = req.body;
            const productId = req.params.product_id;

            if (!status) {
                return sendError(res, 'Status is required', null, 400);
            }

            const product = await Product.findOneAndUpdate(
                { product_id: productId },
                { status },
                { new: true }
            );

            if (!product) {
                return sendError(res, 'Product not found', {}, 404);
            }

            return sendSuccess(res, 'Product status updated successfully', { product });
        } catch (err) {
            return sendError(res, 'Failed to update product status', err.message, 400);
        }
    }; 





    export const getProduct = async (req, res) => {
        try {
            const fullProduct = await Product.aggregate([
                { $match: { product_id: req.params.product_id } },
                {
                    $lookup: {
                        from: 'productimages',
                        localField: 'product_id',
                        foreignField: 'product_id',
                        as: 'images'
                    }
                },
                {
                    $lookup: {
                        from: 'productdescriptions',
                        let: { pid: '$product_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$product_id', '$$pid'] },
                                    language: 'en'
                                }
                            }
                        ],
                        as: 'description'
                    }
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'category_id',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                { $unwind: { path: '$images', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$description', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        product_id: 1,
                        unified_sku: 1,
                        status: 1,
                        title: '$description.title',
                        thumbnail_image: '$images.thumbnail_image',
                        gallery_images: '$images.gallery_images',
                        category: 1
                    }
                }
            ]);
    
            if (!fullProduct || fullProduct.length === 0) {
                return sendError(res, 'Product not found', {}, 404);
            }
    
            const product = fullProduct[0];
    
            // 🔁 Get full parent category hierarchy
            const hierarchy = [];
            let currentCategory = product.category;
    
            while (currentCategory?.parent) {
                const parent = await Category.findById(currentCategory.parent).lean();
                if (!parent) break;
                hierarchy.unshift(parent);
                currentCategory = parent;
            }
    
            if (product.category) {
                hierarchy.push(product.category); // include leaf category
            }
    
            const categoryIds = hierarchy.map(cat => cat._id);
    
            // 🔍 Get mapped attributes for all categories in hierarchy
            const categoryAttributes = await CategoryAttribute.find({
                category_id: { $in: categoryIds }
            }).populate('attribute_id').lean();
    
            // 🧠 Get unique attribute IDs
            const attributeMap = new Map();
            for (const entry of categoryAttributes) {
                const attr = entry.attribute_id;
                if (attr && !attributeMap.has(String(attr._id))) {
                    attributeMap.set(String(attr._id), attr);
                }
            }
    
            const attributes = Array.from(attributeMap.values());
    
            // 🔍 Get all options for all attribute IDs
            const attributeIds = attributes.map(attr => attr._id);
            const options = await AttributeOption.find({
                attributeId: { $in: attributeIds }
            }).lean();
    
            // 🧩 Attach options to each attribute
            const attributeWithOptions = attributes.map(attr => {
                const attrOptions = options.filter(opt => String(opt.attributeId) === String(attr._id));
                return {
                    ...attr,
                    options: attrOptions
                };
            });
    
            return sendSuccess(res, 'Product retrieved successfully', {
                product: {
                    ...product,
                    category_hierarchy: hierarchy,
                    attributes: attributeWithOptions
                }
            });
    
        } catch (err) {
            return sendError(res, 'Failed to retrieve product', err.message, 400);
        }
    };



    export const updateProductDetails = async (req, res) => {
        let session;
        console.log(req.body);
        try {
            // Start MongoDB session
            session = await mongoose.startSession();
            session.startTransaction();

            const {
                productId,
                categoryId,
                attributes,
                pricing,
                stock,
                weight,
                brand,
                hasVariations,
                variations
            } = req.body;

            // Validate required fields
            if (!productId) {
                return sendError(res, 'Product ID is required', null, 400);
            }

            // 1. Update the main product record
            const product = await Product.findOneAndUpdate(
                { product_id: productId },
                { 
                    category_id: categoryId || undefined,
                    type: hasVariations ? 'variable' : 'simple'
                },
                { new: true, session, runValidators: true }
            );

            if (!product) {
                await session.abortTransaction();
                return sendError(res, 'Product not found', null, 404);
            }

            // 2. Update or create product meta
            const metaData = {
                weight,
                stock: hasVariations ? 0 : stock, // Only set stock if not a variable product
                brand_details: brand,
                has_variations: !!hasVariations,
                attributes: attributes || []
            };

            // Use findOneAndUpdate with upsert to handle both create and update scenarios
            await ProductMeta.findOneAndUpdate(
                { product_id: productId },
                metaData,
                { new: true, upsert: true, session, runValidators: true }
            );

            // 3. Handle pricing and variations
            if (!hasVariations) {
                // For simple products, store pricing in ProductPrice
                if (pricing) {
                    // Convert pricing to Decimal128
                    const convertedPricing = {};
                    if (pricing.mrp) convertedPricing.mrp = mongoose.Types.Decimal128.fromString(pricing.mrp.toString());
                    if (pricing.selling_price) convertedPricing.selling_price = mongoose.Types.Decimal128.fromString(pricing.selling_price.toString());
                    if (pricing.wdrp) convertedPricing.wdrp = mongoose.Types.Decimal128.fromString(pricing.wdrp.toString());
                    
                    await ProductPrice.findOneAndUpdate(
                        { product_id: productId },
                        convertedPricing,
                        { new: true, upsert: true, session, runValidators: true }
                    );
                }
                
                // Remove any variation data if product is now simple
                await ProductVariation.deleteOne({ product_id: productId }, { session });
                await ProductCombination.deleteMany({ product_id: productId }, { session });
            } else {
                // For variable products, handle variations
                
                // Remove any simple product pricing
                // await ProductPrice.deleteOne({ product_id: productId }, { session });
                if (pricing?.mrp) {
                    // Save only MRP in ProductPrice
                    await ProductPrice.findOneAndUpdate(
                      { product_id: productId },
                      { mrp: mongoose.Types.Decimal128.fromString(pricing.mrp.toString()) },
                      { new: true, upsert: true, session, runValidators: true }
                    );
                  }
                
                if (variations) {
                    // Save variation attributes
                    await ProductVariation.findOneAndUpdate(
                        { product_id: productId },
                        { attributes: variations.attributes || [] },
                        { new: true, upsert: true, session, runValidators: true }
                    );
                    
                    // Handle combinations
                    if (variations.combinations && variations.combinations.length > 0) {
                        // First delete existing combinations
                        await ProductCombination.deleteMany({ product_id: productId }, { session });
                        
                        // Create combinations with Decimal128 prices
                        const combinationDocs = variations.combinations.map(combo => ({
                            product_id: productId,
                            variant: combo.variant,
                            price: mongoose.Types.Decimal128.fromString(combo.price.toString()),
                            stock: combo.stock,
                            imageUrl: combo.imageUrl,
                            // Generate a unique SKU for each combination
                            sku: `${product.unified_sku}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
                        }));
                        
                        await ProductCombination.insertMany(combinationDocs, { session });
                    }
                }
            }
            product.status = 'in-review';
            await product.save({ session });

            await session.commitTransaction();
            
            return sendSuccess(res, 'Product details updated successfully', {
                product_id: productId,
                product_type: hasVariations ? 'variable' : 'simple',
                has_variations: hasVariations
            });
           
        } catch (err) {
            // If any error occurs, abort the transaction
            if (session) {
                await session.abortTransaction();
            }
            return sendError(res, 'Failed to update product details', err.message, 400);
        } finally {
            // End the session
            if (session) {
                await session.endSession();
            }
        }
    };
