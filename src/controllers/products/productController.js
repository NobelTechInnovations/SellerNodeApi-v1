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


    // Get single product by ID
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
                    { $match: { $expr: { $eq: ['$product_id', '$$pid'] }, language: 'en' } }
                    ],
                    as: 'description'
                }
                },
                {
                    $lookup: {
                    from: 'categories', // Assuming your Category model is named 'categories'
                    localField: 'category_id',
                    foreignField: '_id', // Category model's ID field
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
                    category: '$category.name'
                }
                }
            ]);

            if (!fullProduct || fullProduct.length === 0) {
                return sendError(res, 'Product not found', {}, 404);
            }

            return sendSuccess(res, 'Product retrieved successfully', { product: fullProduct[0] });
            
        } catch (err) {
            return sendError(res, 'Failed to retrieve product', err.message, 400);
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