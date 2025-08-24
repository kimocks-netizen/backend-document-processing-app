// backend/config/constants.js
module.exports = {
    PROCESSING_METHODS: {
      STANDARD: 'standard',
      AI: 'ai'
    },
    
    JOB_STATUS: {
      PROCESSING: 'processing',
      COMPLETED: 'completed',
      FAILED: 'failed'
    },
    
    FILE_TYPES: {
      PDF: 'application/pdf',
      JPEG: 'image/jpeg',
      PNG: 'image/png',
      JPG: 'image/jpg'
    },
    
    ERROR_MESSAGES: {
      INVALID_FILE_TYPE: 'Invalid file type. Only PDF and images are allowed.',
      FILE_TOO_LARGE: 'File size exceeds the 10MB limit.',
      MISSING_FIELDS: 'Missing required fields: firstName, lastName, or dob.',
      PROCESSING_FAILED: 'Document processing failed. Please try again.',
      JOB_NOT_FOUND: 'Job not found.'
    },
    
    SUCCESS_MESSAGES: {
      UPLOAD_SUCCESS: 'Document uploaded successfully',
      PROCESSING_COMPLETE: 'Document processing completed'
    }
  };