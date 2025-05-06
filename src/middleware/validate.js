// src/middleware/validate.js
const { validationResult } = require('express-validator');
const { sendSuccess, sendError } = require('../utils/responseHandler');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Required data not found !', errors.array(), 422);
  }
  next();
};