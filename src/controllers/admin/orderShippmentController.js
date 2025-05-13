import Order from '../../models/orders/order.js';
import Customer from '../../models/customers/customer.js';
import OrderProduct from '../../models/orders/orderProduct.js';
import SellerBusinessDetails from '../../models/users/sellerBusinessDetails.js';
import User from '../../models/users/user.js';

export const sendOrderToDriverForShippment = async (req, res) => {
    try {
        const order = await Order.findOne({ status: 'ready_to_ship' }).populate('orderProduct');
        if (!order) {
            return res.status(400).json({
                success: false,
                message: 'No orders found',
                error: 'No orders found'
            });
        }

        const customer = await Customer.findById(order.customer_id);
        if (!customer) {
            return res.status(400).json({
                success: false,
                message: 'Customer not found',
                error: 'Customer not found'
            });
        }


        const sellerGroups = {};
        const product = order.orderProduct;
        if (product) {
            if (!sellerGroups[product.sellerId]) {
                sellerGroups[product.sellerId] = [];
            }
            sellerGroups[product.sellerId].push(product);
        }
        
        
        const driverOrders = [];
        for (const [sellerId, products] of Object.entries(sellerGroups)) {
           

            const sellerBusiness = await SellerBusinessDetails.findOne({ seller_id: sellerId });
            if (!sellerBusiness) {
                console.error(`Seller business details not found for seller ${sellerId}`);
                continue;
            }
            
            
            const seller = await User.findById(sellerId);
            if (!seller) {
                console.error(`Seller not found for ID ${sellerId}`);
                continue;
            }

            const pickupCoordinates = await getCoordinatesFromAddress(sellerBusiness.business_address);
            if (!pickupCoordinates) {
                console.error(`Could not get coordinates for pickup address: ${sellerBusiness.business_address}`);
                continue;
            }

            const deliveryAddress = customer.address;
            const deliveryCoordinates = await getCoordinatesFromAddress(deliveryAddress);
            if (!deliveryCoordinates) {
                console.error(`Could not get coordinates for delivery address: ${deliveryAddress}`);
                continue;
            } 

            const driverOrder = {
                customerName: customer.name,
                customerPhone: customer.phone,
                storeName: sellerBusiness.business_name,
                storePhone: seller.phone,
                pickupAddress: sellerBusiness.business_address,
                pickupPincode: sellerBusiness.pincode,
                deliveryAddress: deliveryAddress,
                deliveryPincode: customer.pincode,
                pickupLocation: {
                    type: "Point",
                    coordinates: [pickupCoordinates.lat, pickupCoordinates.lng]
                },
                deliveryLocation: {
                    type: "Point",
                    coordinates: [deliveryCoordinates.lat, deliveryCoordinates.lng]
                },
                storeOtp: generateOTP(),
                deliveryOtp: generateOTP(),
                orderProducts: products.map(p => ({
                    name: p.product_instance.name,
                    quantity: p.qty,
                    price: p.base_price
                })),
                customerOrderId: order.order_number.toString()
            };
            driverOrders.push(driverOrder);
        }

        // const driverAppApi = 'http://localhost:6000/api/admin/save-orders-for-delivery';
        const driverAppApi = 'https://delivery-app-api-production.up.railway.app/api/admin/save-orders-for-delivery';

        try {
            const response = await fetch(driverAppApi, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orders: driverOrders })  // Send all orders in one request
            });
        
            const responseText = await response.text(); // Read response body as text
            console.log('Driver API response status:', response.status);
            console.log('Driver API response body:', responseText);
        
            // Optional: handle based on response
            if (response.ok) {
                // You can add logic here if you need to handle a successful response
                await Order.findByIdAndUpdate(order._id, { status: 'ready_to_pickup' });
            } else {
                console.error(`Driver API returned error status: ${response.status}`);
            }
        } catch (error) {
            console.error(`Failed to send order to driver app: ${error.message}`);
        }
        
        return res.status(200).json({
            success: true,
            message: 'Orders sent to drivers successfully',
            data: driverOrders
        });
    }
    catch (err) {
        console.error(err);
        return res.status(400).json({
            success: false,
            message: 'Failed to process orders',
            error: err.message
        });
    }
}

// Helper function to get coordinates from address using Google Maps API
async function getCoordinatesFromAddress(address) {
    try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng };
        }
        return null;    
    } catch (error) {
        console.error('Error getting coordinates:', error);
        return null;
    }
}


// Helper function to generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


export const DriverAcceptedOrder = async (req, res) => {
    try {
        const { order_number } = req.body;
        await Order.findOneAndUpdate({ order_number }, { status: 'driver_accepted' });
        await DriverOrder.create({ order_number, driver_details: req.body.driver_details, status: 'driver_accepted' });
        return res.status(200).json({
            success: true,
            message: 'Order status updated to driver_accepted',
        });
    }
    catch (err) {
        console.error(err);
        return res.status(400).json({
            success: false,
            message: 'Failed to update order status',
        });
    }
}
