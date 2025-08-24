// src/routes/upload.js
const express = require('express');
const multer = require('multer');
const { processDocument } = require('../services/documentProcessor');
const { validateUploadRequest } = require('../middleware/validateRequest');
const { ERROR_MESSAGES } = require('../config/constants');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(ERROR_MESSAGES.INVALID_FILE_TYPE));
    }
  },
});

// POST /api/upload - Handle document upload and processing
router.post('/', upload.single('file'), validateUploadRequest, async (req, res, next) => {
  try {
    const { firstName, lastName, dob, processingMethod } = req.body;
    const file = req.file;

    logger.info('File upload received', {
      fileName: file.originalname,
      fileSize: file.size,
      processingMethod,
      user: `${firstName} ${lastName}`
    });

    // Process the document
    const jobId = await processDocument({
      file: {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      },
      userData: {
        firstName,
        lastName,
        dob,
      },
      processingMethod: processingMethod || 'standard',
    });

    logger.info('Document processing started', { jobId });

    res.status(200).json({
      message: 'Document uploaded successfully',
      jobId,
    });
  } catch (error) {
    logger.error('Upload route error', error);
    next(error);
  }
});

module.exports = router;