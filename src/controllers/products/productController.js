import mongoose from 'mongoose';
import Product from '../../models/products/product.js';
import Images from '../../models/products/productImage.js';
import Titles from '../../models/products/productDescription.js';
import { sendSuccess, sendError } from '../../utils/responseHandler.js';
import slugify from 'slugify'; 
import ProductSellerSKU from '../../models/products/productSellerSku.js';
import crypto from 'crypto';
import { uploadToS3 } from '../../utils/s3Service.js';

    // Create product with transaction
    export const createProduct = async (req, res) => {
        let session;
        try {
            // Start MongoDB session
            session = await mongoose.startSession();
            session.startTransaction();

            const { product, title } = req.body;
            const files = req.files;

            if (!product || !files || !title) {
                return sendError(res, 'Missing required product, images, or title data', null, 400);
            }

            // Upload images to S3
            const uploadedImages = [];
            if (files.images) {
                for (const file of files.images) {
                    const imageUrl = await uploadToS3(file, 'products');
                    uploadedImages.push(imageUrl);
                }
            }

            product.slug = await generateUniqueSlug(title.title || 'product');
            product.slug_hash = generateSlugHash(product.slug);
            
            // Create product within transaction
            const [createdProduct] = await Product.create([product], { session });

            const productImages = {
                product_id: createdProduct.product_id,
                thumbnail_image: uploadedImages[0] || null,
                gallery_images: uploadedImages.slice(1)
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
  

// Get all products with pagination and filters
export const getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, category_id, condition } = req.query;
        const query = {};

        // Build query based on filters
        if (status) query.status = status;
        if (category_id) query.category_id = category_id;
        if (condition) query.condition = condition;

        // Get products with pagination
        const products = await Product.find(query)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('category_id', 'name slug')
            .lean();

        // Get total count for pagination
        const total = await Product.countDocuments(query);

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
        return sendError(res, 'Failed to retrieve products', err.message, 400);
    }
};

// Get single product by ID
export const getProduct = async (req, res) => {
    try {
        const product = await Product.findOne({ product_id: req.params.product_id })
            .populate('category_id', 'name slug')
            .lean();

        if (!product) {
            return sendError(res, 'Product not found', {}, 404);
        }

        return sendSuccess(res, 'Product retrieved successfully', { product });
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

        const { product, title } = req.body;
        const files = req.files;
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

        // Upload and update images if provided
        if (files && files.images) {
            const uploadedImages = [];
            for (const file of files.images) {
                const imageUrl = await uploadToS3(file, 'products');
                uploadedImages.push(imageUrl);
            }

            await Images.findOneAndUpdate(
                { product_id: productId },
                { 
                    thumbnail_image: uploadedImages[0] || updatedProduct.thumbnail_image,
                    gallery_images: uploadedImages.slice(1)
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