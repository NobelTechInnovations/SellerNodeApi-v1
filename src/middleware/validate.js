// src/middleware/validate.js
import { validationResult } from 'express-validator';
import { sendError } from '../utils/responseHandler.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Required data not found !', errors.array(), 422);
  }
  next();
};