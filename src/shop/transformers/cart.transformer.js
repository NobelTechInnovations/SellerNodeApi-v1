export const CartTransformer = {
    cart(cart, fees) {
        return {
            cart_id: cart._id,
            customer_uuid: cart.customerId,
            customer_phone: cart.phone,
            total_items: cart.totalItems,
            total_quantity: cart.totalQuantity,
            cart_subtotal: cart.subtotal,
            cart_tax: cart.tax,
            cart_discount: cart.discount,
            cart_final_amount: cart.finalAmount,
            isActive: cart.isActive,
            isBuyNow: cart.isBuyNow,
            ...fees
        };
    },

    item(item) {
        return {
            id: item._id,
            cart_id: item.cartId,
            product_id: item.productId,
            quantity: item.quantity,
            p_sku: item.sku,
            product_type: item.type,
            price: item.price,
            base_price: item.basePrice,
            tax_amount: item.taxAmount,
            discount_amount: item.discountAmount,
            product_total: item.total,
            additional: item.additional,

            product_details: item.productDetails
                ? {
                    product_name: item.productDetails.name,
                    product_images: item.productDetails.images ?? [],
                    product_price: item.productDetails.price
                }
                : {}
        };
    },

    items(items) {
        return items.map(item => CartTransformer.item(item));
    }
};
