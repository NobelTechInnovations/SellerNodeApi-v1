import User from '../models/users/user.js';
import SellerBankDetails from '../models/users/sellerBankDetails.js';
import SellerBusinessDetails from '../models/users/sellerBusinessDetails.js';
import mongoose from 'mongoose';

// Create SellerDetails model for communication preferences
const sellerDetailsSchema = new mongoose.Schema({
  seller_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  detail_type: { 
    type: String, 
    required: true 
  },
  details: { 
    type: mongoose.Schema.Types.Mixed 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

const SellerDetails = mongoose.models.SellerDetails || mongoose.model('SellerDetails', sellerDetailsSchema);

// Create Warehouse model
const warehouseSchema = new mongoose.Schema({
  seller_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  address: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  contact_person: {
    type: String,
    required: true
  },
  contact_number: {
    type: String,
    required: true
  },
  is_primary: {
    type: Boolean,
    default: false
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  updated_at: { 
    type: Date, 
    default: Date.now 
  }
});

const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', warehouseSchema);

// Get seller profile including personal, bank and business details
export const getSellerProfile = async (req, res) => {
  try {
    const sellerId = req.user._id;

    // Get all seller details in parallel
    const [user, bankDetails, businessDetails, communicationDetails, warehouses] = await Promise.all([
      User.findById(sellerId),
      SellerBankDetails.find({ seller_id: sellerId, deleted_at: null }),
      SellerBusinessDetails.findOne({ seller_id: sellerId }),
      SellerDetails.findOne({ 
        seller_id: sellerId, 
        detail_type: 'communication_preference' 
      }),
      Warehouse.find({ seller_id: sellerId })
    ]);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Seller not found' 
      });
    }

    // Compile all data
    const profileData = {
      personal: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        businessName: businessDetails ? businessDetails.business_name : null,
        status: user.status,
        profile_complete: user.profile_complete
      },
      bank_details: bankDetails || [],
      business_details: businessDetails || {},
      communication_preferences: communicationDetails ? communicationDetails.details : {},
      warehouses: warehouses || []
    };

    return res.status(200).json({
      success: true,
      data: profileData
    });
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch seller profile',
      error: error.message
    });
  }
};

// Update seller personal details
export const updatePersonalDetails = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { name, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      sellerId,
      { name, email },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Seller not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Personal details updated successfully',
      data: {
        name: updatedUser.name,
        email: updatedUser.email,
      }
    });
  } catch (error) {
    console.error('Error updating personal details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update personal details',
      error: error.message
    });
  }
};

// Update bank details
export const updateBankDetails = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const {
      bank_id,
      bank_name,
      account_number,
      account_holder_name,
      branch_name,
      ifsc_code,
      is_primary
    } = req.body;

    let bankDetails;

    // If bank_id is provided, update existing record
    if (bank_id) {
      // If making this account primary, first set all other accounts to non-primary
      if (is_primary) {
        await SellerBankDetails.updateMany(
          { seller_id: sellerId },
          { is_primary: false }
        );
      }

      bankDetails = await SellerBankDetails.findOneAndUpdate(
        { _id: bank_id, seller_id: sellerId },
        {
          bank_name,
          account_number,
          account_holder_name,
          branch_name,
          ifsc_code,
          is_primary: is_primary || false
        },
        { new: true, runValidators: true }
      );

      if (!bankDetails) {
        return res.status(404).json({
          success: false,
          message: 'Bank details not found'
        });
      }
    } else {
      // Create new bank details
      // If this is the first bank account, make it primary
      const existingAccounts = await SellerBankDetails.countDocuments({ seller_id: sellerId });
      
      // If making this account primary, first set all other accounts to non-primary
      if (is_primary || existingAccounts === 0) {
        await SellerBankDetails.updateMany(
          { seller_id: sellerId },
          { is_primary: false }
        );
      }

      bankDetails = await SellerBankDetails.create({
        seller_id: sellerId,
        bank_name,
        account_number,
        account_holder_name,
        branch_name,
        ifsc_code,
        is_primary: is_primary || existingAccounts === 0 // Make primary if it's the first account
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Bank details updated successfully',
      data: bankDetails
    });
  } catch (error) {
    console.error('Error updating bank details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update bank details',
      error: error.message
    });
  }
};

// Update business details
export const updateBusinessDetails = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const {
      business_name,
      business_address,
      pincode,
      business_identity_number,
      business_identity_type,
      currency,
      language,
      documents
    } = req.body;

    // Find existing business details or create new ones
    let businessDetails = await SellerBusinessDetails.findOne({ seller_id: sellerId });

    if (businessDetails) {
      // Update existing business details
      businessDetails = await SellerBusinessDetails.findOneAndUpdate(
        { seller_id: sellerId },
        {
          business_name,
          business_address,
          pincode,
          business_identity_number,
          business_identity_type,
          currency,
          language,
          documents
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new business details
      businessDetails = await SellerBusinessDetails.create({
        seller_id: sellerId,
        business_name,
        business_address,
        pincode,
        business_identity_number,
        business_identity_type,
        currency,
        language,
        documents
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Business details updated successfully',
      data: businessDetails
    });
  } catch (error) {
    console.error('Error updating business details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update business details',
      error: error.message
    });
  }
};

// Update seller communication preferences
export const updateCommunicationPreferences = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid preferences object is required'
      });
    }

    // Find or create seller details for communication preferences
    let communicationDetails = await SellerDetails.findOne({
      seller_id: sellerId,
      detail_type: 'communication_preference'
    });

    if (communicationDetails) {
      // Update existing preferences
      communicationDetails = await SellerDetails.findOneAndUpdate(
        {
          seller_id: sellerId,
          detail_type: 'communication_preference'
        },
        {
          details: preferences,
          updated_at: Date.now()
        },
        { new: true }
      );
    } else {
      // Create new preferences
      communicationDetails = await SellerDetails.create({
        seller_id: sellerId,
        detail_type: 'communication_preference',
        details: preferences
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Communication preferences updated successfully',
      data: communicationDetails
    });
  } catch (error) {
    console.error('Error updating communication preferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update communication preferences',
      error: error.message
    });
  }
};

// Add new bank account (no updates allowed, only add new)
export const addBankDetails = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const {
      bank_name,
      account_number,
      account_holder_name,
      branch_name,
      ifsc_code,
      is_primary
    } = req.body;

    // If making this account primary, first set all other accounts to non-primary
    const existingAccounts = await SellerBankDetails.countDocuments({ seller_id: sellerId });
    
    if (is_primary || existingAccounts === 0) {
      await SellerBankDetails.updateMany(
        { seller_id: sellerId },
        { is_primary: false }
      );
    }

    const bankDetails = await SellerBankDetails.create({
      seller_id: sellerId,
      bank_name,
      account_number,
      account_holder_name,
      branch_name,
      ifsc_code,
      is_primary: is_primary || existingAccounts === 0 // Make primary if it's the first account
    });

    return res.status(201).json({
      success: true,
      message: 'Bank details added successfully',
      data: bankDetails
    });
  } catch (error) {
    console.error('Error adding bank details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add bank details',
      error: error.message
    });
  }
};

// Remove bank account
export const removeBankDetails = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { bank_id } = req.params;

    const bankDetails = await SellerBankDetails.findOne({ 
      _id: bank_id, 
      seller_id: sellerId 
    });

    if (!bankDetails) {
      return res.status(404).json({
        success: false,
        message: 'Bank details not found'
      });
    }

    // Soft delete by setting deleted_at
    await SellerBankDetails.findByIdAndUpdate(
      bank_id,
      { deleted_at: new Date() }
    );

    // If the deleted account was primary, make another account primary if available
    if (bankDetails.is_primary) {
      const anotherAccount = await SellerBankDetails.findOne({ 
        seller_id: sellerId,
        deleted_at: null,
        _id: { $ne: bank_id }
      });
      
      if (anotherAccount) {
        await SellerBankDetails.findByIdAndUpdate(
          anotherAccount._id,
          { is_primary: true }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Bank details removed successfully'
    });
  } catch (error) {
    console.error('Error removing bank details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove bank details',
      error: error.message
    });
  }
};

// Add warehouse location
export const addWarehouseLocation = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const {
      address,
      pincode,
      contact_person,
      contact_number,
      is_primary
    } = req.body;

    // If making this warehouse primary, first set all other warehouses to non-primary
    const existingWarehouses = await Warehouse.countDocuments({ seller_id: sellerId });
    
    if (is_primary || existingWarehouses === 0) {
      await Warehouse.updateMany(
        { seller_id: sellerId },
        { is_primary: false }
      );
    }

    const warehouse = await Warehouse.create({
      seller_id: sellerId,
      address,
      pincode,
      contact_person,
      contact_number,
      is_primary: is_primary || existingWarehouses === 0 // Make primary if it's the first warehouse
    });

    return res.status(201).json({
      success: true,
      message: 'Warehouse location added successfully',
      data: warehouse
    });
  } catch (error) {
    console.error('Error adding warehouse location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add warehouse location',
      error: error.message
    });
  }
};

// Update warehouse location
export const updateWarehouseLocation = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { warehouse_id } = req.params;
    const {
      address,
      pincode,
      contact_person,
      contact_number,
      is_primary
    } = req.body;

    // Check if warehouse exists
    const existingWarehouse = await Warehouse.findOne({ 
      _id: warehouse_id, 
      seller_id: sellerId 
    });

    if (!existingWarehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse location not found'
      });
    }

    // If making this warehouse primary, first set all other warehouses to non-primary
    if (is_primary) {
      await Warehouse.updateMany(
        { seller_id: sellerId },
        { is_primary: false }
      );
    }

    // Update warehouse
    const warehouse = await Warehouse.findByIdAndUpdate(
      warehouse_id,
      {
        address,
        pincode,
        contact_person,
        contact_number,
        is_primary: is_primary || false,
        updated_at: new Date()
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Warehouse location updated successfully',
      data: warehouse
    });
  } catch (error) {
    console.error('Error updating warehouse location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update warehouse location',
      error: error.message
    });
  }
};

// Delete warehouse location
export const deleteWarehouseLocation = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { warehouse_id } = req.params;

    // Check if warehouse exists
    const warehouse = await Warehouse.findOne({ 
      _id: warehouse_id, 
      seller_id: sellerId 
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse location not found'
      });
    }

    // Delete the warehouse
    await Warehouse.findByIdAndDelete(warehouse_id);

    // If the deleted warehouse was primary, make another warehouse primary if available
    if (warehouse.is_primary) {
      const anotherWarehouse = await Warehouse.findOne({ 
        seller_id: sellerId,
        _id: { $ne: warehouse_id }
      });
      
      if (anotherWarehouse) {
        await Warehouse.findByIdAndUpdate(
          anotherWarehouse._id,
          { is_primary: true }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Warehouse location deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting warehouse location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete warehouse location',
      error: error.message
    });
  }
};
