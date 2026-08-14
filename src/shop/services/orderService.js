import BaseService from './baseService.js';
import Order from '../../models/orders/order.js';
import OrderProduct from '../../models/orders/orderProduct.js';
import { Cart, CartItem } from '../models/cart/index.js';
import OrderCustomer from '../../models/customers/customer.js';
import ProductSellerSKU from '../../models/products/productSellerSku.js';

class OrderService extends BaseService {

    /**
     * Places an order from the customer's active cart.
     *
     * A cart can contain products from multiple sellers. Rather than one
     * Order with mixed line items (which made partial shipment/cancellation
     * impossible to scope to a single seller), this creates ONE Order
     * PER SELLER, all sharing a common `order_group_id` so the buyer can
     * see they were placed together — but each order is otherwise fully
     * independent: own order_number, own status, own totals. A seller
     * accepting/rejecting/shipping their order can never affect another
     * seller's order, because there's no shared order to affect.
     *
     * NOTE on transactions: this deliberately does NOT use a Mongoose
     * session/transaction. `mongoose.startSession()` was tested and
     * verified to work correctly on a fresh connection to this cluster,
     * but reliably hangs on the app server's long-lived connection here —
     * an infrastructure limitation of this specific (legacy/constrained)
     * MongoDB cluster, not a code issue. The pre-existing codebase never
     * used transactions for order placement either. On any failure partway
     * through, already-created documents for this call are best-effort
     * cleaned up below so a failed checkout doesn't leave orphaned orders.
     */
    async placeOrder(customer, orderData = {}) {
        return await this.handleDBOperation(async () => {
            const cart = await Cart.findOne({ customerId: customer._id, isActive: true });
            if (!cart) throw new Error('No active cart found for this customer');

            const cartItems = await CartItem.find({ cartId: cart._id, saveForLater: false });
            if (cartItems.length === 0) throw new Error('Cart is empty');

            // Resolve each item's seller via ProductSellerSKU — this is the
            // only reliable source today. CartItem.productDetails.sellerId
            // is always empty due to an unrelated pre-existing bug in
            // cartService.fetchProductDetails (Product has no sellerId
            // field at all), which this does not attempt to fix.
            const itemsWithSeller = await Promise.all(cartItems.map(async (item) => {
                const sellerSku = await ProductSellerSKU.findOne({ product_id: item.productId }).lean();
                return { item, sellerId: sellerSku?.seller_id?.toString() || null };
            }));

            const unresolved = itemsWithSeller.find((entry) => !entry.sellerId);
            if (unresolved) {
                throw new Error(`No seller found for product ${unresolved.item.productId}`);
            }

            // Group cart items by seller
            const itemsBySeller = new Map();
            for (const { item, sellerId } of itemsWithSeller) {
                if (!itemsBySeller.has(sellerId)) itemsBySeller.set(sellerId, []);
                itemsBySeller.get(sellerId).push(item);
            }

            const orderGroupId = `GRP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const cartSubtotal = cart.subtotal || 0;

            const createdOrders = [];
            const createdOrderIds = [];

            try {
                let sellerIndex = 0;

                for (const [sellerId, items] of itemsBySeller) {
                    sellerIndex++;
                    const orderNumber = `SO24-${Date.now()}-${sellerIndex}-${Math.floor(Math.random() * 1000)}`;

                    const sellerSubtotal = items.reduce((sum, i) => sum + i.total, 0);
                    const sellerTax = items.reduce((sum, i) => sum + i.taxAmount, 0);
                    const sellerDiscount = items.reduce((sum, i) => sum + i.discountAmount, 0);
                    const sellerQty = items.reduce((sum, i) => sum + i.quantity, 0);

                    // Split shared platform/delivery fees proportionally by
                    // this seller's share of the cart subtotal — fair, and
                    // avoids a "buy one cheap item from seller A to dodge
                    // all fees" gap that a flat fee-on-first-order would
                    // create.
                    const feeShare = cartSubtotal > 0 ? sellerSubtotal / cartSubtotal : 1 / itemsBySeller.size;
                    const sellerShipping = Math.round((orderData.shipping || 0) * feeShare);
                    const sellerFinal = sellerSubtotal + sellerTax - sellerDiscount + sellerShipping;

                    const order = await Order.create({
                        order_number: orderNumber,
                        order_group_id: orderGroupId,
                        seller_id: sellerId,
                        customer_id: customer._id,
                        customer_email: customer.email,
                        total_amount: sellerFinal,
                        total_qty: sellerQty,
                        total_item: items.length,
                        sub_total_amount: sellerSubtotal,
                        final_amount: sellerFinal,
                        discount: sellerDiscount,
                        tax: sellerTax,
                        shipping: sellerShipping,
                        extra: orderData.extra || {},
                    });
                    createdOrderIds.push(order._id);

                    const customerdetails = await OrderCustomer.create({
                        orderId: order._id,
                        // Phone-only OTP customers may never have set a
                        // display name — fall back to phone (guaranteed
                        // present) rather than failing OrderCustomer's
                        // required `name` validation.
                        name: customer.name || customer.phone,
                        email: customer.email,
                        phone: customer.phone,
                        address: orderData.address,
                        pincode: orderData.pincode,
                        latitude: orderData.latitude,
                        longitude: orderData.longitude,
                    });

                    const orderProductDocs = [];
                    for (const item of items) {
                        const orderProduct = await OrderProduct.create({
                            order_id: order._id,
                            sku: item.sku,
                            productId: item.productId,
                            product_type: item.type,
                            base_price: item.basePrice,
                            qty: item.quantity,
                            total: item.total,
                            shipping: 0,
                            tax: item.taxAmount,
                            discount: item.discountAmount,
                            sellerId,
                            product_instance: {
                                name: item.productDetails?.name,
                                image: item.productDetails?.images?.[0],
                                order_price: item.price,
                                qty: item.quantity,
                                id: item.productId,
                                sku: item.sku
                            }
                        });
                        orderProductDocs.push(orderProduct);
                    }

                    // Deprecated single-item pointer, kept for backward
                    // compat with reverse lookups elsewhere — see the
                    // comment on Order.orderProduct.
                    order.orderProduct = orderProductDocs[0]._id;
                    order.orderCustomer = customerdetails._id;
                    await order.save();

                    createdOrders.push(order);
                }

                cart.isActive = false;
                await cart.save();

                return { orders: createdOrders, order_group_id: orderGroupId };
            } catch (err) {
                // Best-effort compensation: remove whatever was created in
                // this call before the failure, so a failed checkout doesn't
                // leave orphaned/half-formed orders behind.
                if (createdOrderIds.length > 0) {
                    await Promise.allSettled([
                        Order.deleteMany({ _id: { $in: createdOrderIds } }),
                        OrderProduct.deleteMany({ order_id: { $in: createdOrderIds } }),
                        OrderCustomer.deleteMany({ orderId: { $in: createdOrderIds } }),
                    ]);
                }
                throw err;
            }
        });
    }
}

export default new OrderService();
