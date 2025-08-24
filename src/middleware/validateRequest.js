// src/middleware/validateRequest.js
const { ERROR_MESSAGES } = require('../config/constants');

const validateUploadRequest = (req, res, next) => {
  const { firstName, lastName, dob } = req.body;
  
  if (!firstName || !lastName || !dob) {
    return res.status(400).json({ 
      error: ERROR_MESSAGES.MISSING_FIELDS 
    });
  }
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dob)) {
    return res.status(400).json({ 
      error: 'Invalid date format. Use YYYY-MM-DD.' 
    });
  }
  
  next();
};

module.exports = {
  validateUploadRequest
};