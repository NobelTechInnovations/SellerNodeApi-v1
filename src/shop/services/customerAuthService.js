import BaseService from './baseService.js';
import { 
    CustomerOtp,
    Customer,
    CustomerAddress,
    CustomerBank,
    CustomerPaymentMethod 
} from '../models/index.js';
import customerDbConnection from '../config/database.js';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/index.js';
import { getCoordinates } from '../utils/googleAdress.js';

class CustomerAuthService extends BaseService {
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async requestOTP(phone) {
        return await this.handleDBOperation(async () => {
            // Generate a new 6-digit OTP
            const otp = this.generateOTP();
            
            // Save OTP to database
            await CustomerOtp.create({
                phone,
                otp,
                isVerified: false
            });

            return { otp };
        });
    }

    async verifyOTP(phone, otp) {
        return await this.handleDBOperation(async () => {
            // Find the latest OTP entry for this phone
            const otpRecord = await CustomerOtp.findOne({
                phone,
                otp,
                isVerified: false
            }).sort({ createdAt: -1 });

            if (!otpRecord) {
                throw new AppError('Invalid OTP or OTP expired', 400);
            }

            // Mark OTP as verified
            otpRecord.isVerified = true;
            await otpRecord.save();

            // Find or create customer
            let customer = await Customer.findOne({ phone });
            if (!customer) {
                customer = await Customer.create({
                    phone,
                    lastLoginAt: new Date()
                });
            } else {
                customer.lastLoginAt = new Date();
                await customer.save();
            }

            // Generate JWT token
            const token = jwt.sign(
                { customerId: customer._id },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            return {
                token,
                customer
            };
        });
    }

    async getAuthProfile(customerId) {
        return Customer.findById(customerId)
          .populate('addresses')
          .populate('bankDetails')
          .populate('paymentMethods')
          .then(customer => {
            if (!customer) {
              return { success: false, message: 'User not found' };
            }
            return { success: true, data: customer };
          });
    }

    async updateProfile(customer, data) {
        return await this.handleDBOperation(async () => {
            if (customerDbConnection.readyState !== 1) {
                throw new AppError('Database connection unavailable', 503);
            }

            // Update customer profile
            const updatedCustomer = await Customer.findByIdAndUpdate(
                customer._id,
                data,
                { 
                    new: true,
                    runValidators: true
                }
            );

            if (!updatedCustomer) {
                throw new AppError('Customer not found', 404);
            }

            return updatedCustomer;
        });
    }

    async customerBankAdd(customer, data) {
        return await this.handleDBOperation(async () => {
            if (customerDbConnection.readyState !== 1) {
                throw new AppError('Database connection unavailable', 503);
            }

            // Validate account type
            if (data.accountType && !['savings', 'current'].includes(data.accountType.toLowerCase())) {
                throw new AppError('Invalid account type. Must be either "savings" or "current"', 400);
            }

            // Add new bank details with proper field mapping
            const newBank = new CustomerBank({
                customerId: customer._id, // Map customer._id to customerId as per schema
                accountHolderName: data.accountHolderName,
                bankName: data.bankName,
                accountNumber: data.accountNumber,
                branchName: data.branchName,
                ifscCode: data.ifscCode,
                accountType: data.accountType?.toLowerCase(), // Ensure lowercase to match enum
                accountAddress: data.accountAddress,
                isVerified: false,
                isDefault: data.isDefault || false
            });

            await newBank.save();

            // Update customer's bankDetails array
            await Customer.findByIdAndUpdate(
                customer._id,
                { $addToSet: { bankDetails: newBank._id } },
                { new: true }
            );

            return newBank;
        });
    }
    
    async customerPaymentMethodAdd(customer, data) {
        return await this.handleDBOperation(async () => {
            if (customerDbConnection.readyState !== 1) {
                throw new AppError('Database connection unavailable', 503);
            }

            // Validate method type
            if (!['bank', 'card', 'upi'].includes(data.methodType)) {
                throw new AppError('Invalid method type. Must be bank, card, or upi', 400);
            }

            let details;
            
            // Validate and structure details based on methodType
            switch (data.methodType) {
                case 'upi':
                    if (!data.upiId) {
                        throw new AppError('UPI ID is required for UPI payment method', 400);
                    }
                    details = {
                        upiId: data.upiId
                    };
                    break;

                case 'bank':
                    if (!data.bankName || !data.accountNumber || !data.ifscCode) {
                        throw new AppError('Bank name, account number, and IFSC code are required for bank payment method', 400);
                    }
                    details = {
                        bankName: data.bankName,
                        accountNumber: data.accountNumber,
                        ifscCode: data.ifscCode,
                        branchAddress: data.branchAddress,
                        accountHolderName: data.accountHolderName,
                        accountType: data.accountType
                    };
                    break;

                case 'card':
                    if (!data.cardNumber || !data.cardHolderName || !data.expiryDate) {
                        throw new AppError('Card number, holder name, and expiry date are required for card payment method', 400);
                    }
                    details = {
                        cardNumber: data.cardNumber,
                        cardHolderName: data.cardHolderName,
                        expiryDate: data.expiryDate,
                        cvv: data.cvv
                    };
                    break;
            }

            // Create new payment method
            const newPaymentMethod = new CustomerPaymentMethod({
                customerId: customer._id,
                methodType: data.methodType,
                details: details,
                isDefault: data.isDefault || false
            });

            await newPaymentMethod.save();

            // If this is set as default, unset any other default payment methods
            if (data.isDefault) {
                await CustomerPaymentMethod.updateMany(
                    { 
                        customerId: customer._id, 
                        _id: { $ne: newPaymentMethod._id },
                        isDefault: true 
                    },
                    { $set: { isDefault: false } }
                );
            }

            // Update customer's paymentMethods array
            await Customer.findByIdAndUpdate(
                customer._id,
                { $addToSet: { paymentMethods: newPaymentMethod._id } },
                { new: true }
            );

            // Remove sensitive data before returning
            if (newPaymentMethod.details.cvv) {
                delete newPaymentMethod.details.cvv;
            }
            if (newPaymentMethod.details.cardNumber) {
                newPaymentMethod.details.cardNumber = `****${newPaymentMethod.details.cardNumber.slice(-4)}`;
            }

            return newPaymentMethod;
        });
    }
            
    async customerAddressAdd(customer, data) {
        return await this.handleDBOperation(async () => {
            if (!customerDbConnection.readyState) {
                await customerDbConnection.connect();
            }

            const { address, isDefault = false, ...rest } = data;
       
            if (!address) {
              throw new AppError('Address is required', 400);
            }

            // Get coordinates from address
            const coordinates = await getCoordinates(address);

            // Create new address instance
            const newAddress = new CustomerAddress({
                customerId: customer._id,
                address,
                isDefault,
                ...rest,
                location: {
                    type: 'Point',
                    coordinates: [coordinates.longitude, coordinates.latitude]
                }
            });
       
            // Save the new address
            await newAddress.save();

            // If this is set as default, unset any other default addresses
            if (isDefault) {
                await CustomerAddress.updateMany(
                    { 
                        customerId: customer._id, 
                        _id: { $ne: newAddress._id },
                        isDefault: true 
                    },
                    { $set: { isDefault: false } }
                );
            }

            // Add address ID to customer's addresses list
            await Customer.findByIdAndUpdate(
                customer._id,
                { $addToSet: { addresses: newAddress._id } },
                { new: true }
            );

            return newAddress;
        });
    }
      
}

export default new CustomerAuthService(); 