import BaseService from './baseService.js';
import Order from '../../models/orders/order.js';
import cartService from './cartService.js';
import OrderProduct from '../../models/orders/orderProduct.js';
import OrderVendor from '../..//models/orders/orderVendor.js';
import { Cart, CartItem } from '../models/cart/index.js';
import OrderCustomer from '../../models/customers/customer.js';
import mongoose from 'mongoose';
import ProductSellerSKU from '../../models/products/productSellerSku.js';

class OrderService extends BaseService {

    async placeOrder(customer, orderData = {}) {

        return await this.handleDBOperation(async () => {
            const cart = await Cart.findOne({ customerId: customer._id, isActive: true });
            if (!cart) throw new Error('No active cart found for this customer');

            const cartItems = await CartItem.find({ cartId: cart._id, saveForLater: false });
            if (cartItems.length === 0) throw new Error('Cart is empty');

            const orderNumber = `SO24-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            const customerdetails = await OrderCustomer.create({

                customerId: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: orderData.address,
                pincode: orderData.pincode,
              });


            const order = await Order.create({
                order_number: orderNumber,
                customer_id: customer._id,
                customer_email: customer.email,
                total_amount: cart.finalAmount,
                total_qty: cart.totalQuantity,
                total_item: cart.totalItems,
                sub_total_amount: cart.subtotal,
                final_amount: cart.finalAmount,
                discount: cart.discount,
                tax: cart.tax,
                shipping: orderData.shipping || 0,
                extra: orderData.extra || {},
            });

         

         

            const orderProducts = await Promise.all(
                cartItems.map(async (item) => {
                  const orderProduct = new OrderProduct({
                    sku: item.sku,
                    productId: item.productId,
                    product_type: item.type,
                    base_price: item.basePrice,
                    qty: item.quantity,
                    total: item.total,
                    shipping: 0,
                    tax: item.taxAmount,
                    discount: item.discountAmount,
                    sellerId: item.productDetails?.sellerId,
                    product_instance: {
                      name: item.productDetails?.name,
                      image: item.productDetails?.images?.[0],
                      order_price: item.price,
                      qty: item.quantity,
                      id: item.productId,
                      sku: item.sku
                    }
                  });
                  const savedProduct = await orderProduct.save();
                  // 6. Link orderVendor for each seller
                  try {
                    const sellerSku = await ProductSellerSKU.findOne({
                        product_id: item.productId, 
                      });
                      
                      if (!sellerSku) {
                        console.error(`No seller found for SKU: ${item.sku}`);
                        return null;
                      }

                      const orderVendor = await OrderVendor.create({
                        orderID: order._id,
                        sellerId: sellerSku.seller_id,
                        order_vendor_id: `${order._id}/${sellerSku.seller_id}`,
                        order_vendor_uuid: `SO24-${Math.floor(Math.random() * 100000)}`,
                      });
                  } catch (err) {
                    console.error("OrderVendor save failed:", err.message);
                  }
                  return savedProduct;
                })
            );

            if (orderProducts.length > 0) {
                order.orderProduct = orderProducts[0]._id;
                order.orderCustomer = customerdetails._id;
                await order.save();
            }
            cart.isActive = false;
            await cart.save();
    
            return { order, orderProducts };
        });
    }
}

export default new OrderService();