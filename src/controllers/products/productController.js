const mongoose = require('mongoose');
const Product = require('../../models/products/product');
const Images = require('../../models/products/productImage');
const Titles = require('../../models/products/productDescription');
const { sendSuccess, sendError } = require('../../utils/responseHandler');

// Create product with transaction
exports.createProduct = async (req, res) => {
    let session;
    try {
        // Start MongoDB session
        session = await mongoose.startSession();
        session.startTransaction();

        const { product, images, title } = req.body;

        if (!product || !images || !title) {
            return sendError(res, 'Missing required product, images, or title data', null, 400);
        }

        // Add created_by from the authenticated user
        product.created_by = req.user._id;
        
        // Create product within transaction
        const [createdProduct] = await Product.create([product], { session });

        images.product_id = createdProduct.product_id;
        title.product_id = createdProduct.product_id;

        await Images.create([images], { session });
        await Titles.create([title], { session }); // Fixed typo here

        // Commit the transaction
        await session.commitTransaction();
        
        return sendSuccess(res, 'Product created successfully', { product: createdProduct });
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

// Get all products with pagination and filters
exports.getProducts = async (req, res) => {
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
exports.getProduct = async (req, res) => {
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
exports.updateProduct = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const { product, images, title } = req.body;
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
        if (images && images.gallery_images) {
            await Images.findOneAndUpdate(
                { product_id: productId },
                { gallery_images: images.gallery_images.map(img => img.url) },
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
exports.deleteProduct = async (req, res) => {
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
exports.updateProductStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const product = await Product.findOneAndUpdate(
            { product_id: req.params.product_id },
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