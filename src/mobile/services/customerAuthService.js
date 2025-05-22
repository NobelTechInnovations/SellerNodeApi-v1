import BaseService from './baseService.js';
import { CustomerOtp } from '../models/index.js';
import { Customer } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/index.js';

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
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '30d' }
            );

            return {
                token,
                customer
            };
        });
    }
}

export default new CustomerAuthService(); 