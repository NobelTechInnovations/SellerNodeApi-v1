// src/middleware/validate.js
const { validationResult } = require('express-validator');
const { sendSuccess, sendError } = require('../utils/responseHandler');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Mobile number not found !', errors.array(), 401);
  }
  next();
};