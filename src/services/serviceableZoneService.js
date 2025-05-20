import ServiceableZone from '../models/admin/ServiceableZone.js';
import SellerBusinessDetails from '../models/users/sellerBusinessDetails.js';
import User from '../models/users/user.js';

/**
 * Update or create serviceable zone for a seller
 */
export const updateServiceableZone = async (sellerId) => {
  try {
    // Get seller and business details
    const [seller, businessDetails] = await Promise.all([
      User.findById(sellerId),
      SellerBusinessDetails.findOne({ seller_id: sellerId })
    ]);

    if (!seller || !businessDetails || !businessDetails.location) {
      console.log('Insufficient data for serviceable zone update:', { sellerId });
      return null;
    }

    // Update or create serviceable zone
    const serviceableZone = await ServiceableZone.findOneAndUpdate(
      { seller_id: sellerId },
      {
        $set: {
          location: businessDetails.location,
          seller_info: {
            name: seller.name,
            business_address: businessDetails.business_address,
            pincode: businessDetails.pincode
          },
          is_active: seller.status === 'active',
          updated_at: new Date()
        }
      },
      { upsert: true, new: true }
    );

    // Here you would typically notify your mobile app backend about the update
    // This could be through a message queue, webhook, or other mechanism
    await notifyMobileAppBackend(serviceableZone);

    return serviceableZone;
  } catch (error) {
    console.error('Error updating serviceable zone:', error);
    throw error;
  }
};

/**
 * Notify mobile app backend about serviceable zone updates
 * This is a placeholder function - implement according to your notification system
 */
async function notifyMobileAppBackend(serviceableZone) {
  try {
    // This is where you would implement your notification logic
    // For example, using a message queue or webhook
    console.log('Notifying mobile app backend about serviceable zone update:', {
      seller_id: serviceableZone.seller_id,
      pincode: serviceableZone.seller_info.pincode,
      is_active: serviceableZone.is_active
    });

    // Example: If you're using a REST API endpoint
    /*
    await fetch('YOUR_MOBILE_APP_BACKEND_URL/update-serviceable-zones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'YOUR_AUTH_TOKEN'
      },
      body: JSON.stringify(serviceableZone)
    });
    */
  } catch (error) {
    console.error('Error notifying mobile app backend:', error);
    // Don't throw the error - we don't want to break the main flow
    // but do log it for monitoring
  }
}

/**
 * Create serviceable zone entry after seller onboarding
 */
export const createServiceableZone = async (sellerId) => {
  try {
    // Get business details
    const businessDetails = await SellerBusinessDetails.findOne({ seller_id: sellerId });
    
    if (!businessDetails || !businessDetails.location) {
      console.log('Business details or location not found for seller:', sellerId);
      return null;
    }

    // Create serviceable zone entry
    const serviceableZone = await ServiceableZone.create({
      seller_id: sellerId,
      pincode: businessDetails.pincode,
      business_address: businessDetails.business_address,
      location: businessDetails.location,
      is_active: true
    });

    return serviceableZone;
  } catch (error) {
    console.error('Error creating serviceable zone:', error);
    throw error;
  }
}; 