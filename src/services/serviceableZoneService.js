import ServiceableZone from '../models/admin/ServiceableZone.js';
import SellerBusinessDetails from '../models/users/sellerBusinessDetails.js';
import User from '../models/users/user.js';

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