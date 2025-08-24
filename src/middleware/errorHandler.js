// src/middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (error, req, res, next) => {
  logger.error('Unhandled error', error, {
    path: req.path,
    method: req.method,
    body: req.body
  });
  
  // Default error
  let statusCode = 500;
  let message = 'Internal server error';
  
  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected field';
  } else if (error.message.includes('Invalid file type')) {
    statusCode = 400;
    message = error.message;
  }
  
  // Database errors
  if (error.code === '23505') { // Unique violation
    statusCode = 409;
    message = 'Resource already exists';
  }
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
};

module.exports = errorHandler;