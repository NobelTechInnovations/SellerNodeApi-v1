import { body } from 'express-validator';
import BaseValidator from './baseValidator.js';

export const requestOtpValidator = [
    body('phone')
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^[0-9]{10}$/)
        .withMessage('Please enter a valid 10-digit phone number'),
    BaseValidator.validate
];

export const verifyOtpValidator = [
    body('phone')
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^[0-9]{10}$/)
        .withMessage('Please enter a valid 10-digit phone number'),
    body('otp')
        .notEmpty()
        .withMessage('OTP is required')
        .matches(/^[0-9]{6}$/)
        .withMessage('Please enter a valid 6-digit OTP'),
    BaseValidator.validate
]; 