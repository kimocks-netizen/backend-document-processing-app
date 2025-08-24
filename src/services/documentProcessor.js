// src/services/documentProcessor.js
const { v4: uuidv4 } = require('uuid');
const { extractTextFromPDF } = require('./pdfExtractor');
const { extractTextFromImage } = require('./imageExtractor');
const { processWithAI } = require('./aiProcessor');
const { calculateAge } = require('./utils');
const { storeFile, storeDocumentMetadata, updateProcessingResults } = require('./supabaseService');
const logger = require('../utils/logger');

/**
 * Process uploaded document based on the selected method
 * @param {Object} params - Document processing parameters
 * @returns {Promise<string>} Job ID
 */
async function processDocument(params) {
  const { file, userData, processingMethod } = params;
  const jobId = uuidv4();

  try {
    logger.info('Starting document processing', { jobId, processingMethod });

    // To Store file in Supabase Storage
    const fileUrl = await storeFile(file.buffer, file.originalname, file.mimetype);

    // To Store initial metadata
    await storeDocumentMetadata({
      jobId,
      fileUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
      userData,
      processingMethod,
    });

    // Process the document asynchronously
    processDocumentAsync(jobId, file, userData, processingMethod, fileUrl);

    return jobId;
  } catch (error) {
    logger.error('Error in processDocument', error, { jobId });
    throw error;
  }
}

/**
 * Async document processing function
 */
async function processDocumentAsync(jobId, file, userData, processingMethod, fileUrl) {
  try {
    let rawText = '';

    // Extract text based on file type
    if (file.mimetype === 'application/pdf') {
      logger.info('Extracting text from PDF', { jobId });
      rawText = await extractTextFromPDF(file.buffer);
    } else if (file.mimetype.startsWith('image/')) {
      logger.info('Extracting text from image', { jobId });
      rawText = await extractTextFromImage(file.buffer);
    }

    logger.info('Text extraction completed', { 
      jobId, 
      textLength: rawText.length,
      processingMethod 
    });

    let aiExtractedData = null;
    
    // Process with AI if selected
    if (processingMethod === 'ai') {
      logger.info('Starting AI processing', { jobId });
      aiExtractedData = await processWithAI(rawText);
      logger.info('AI processing completed', { jobId });
    }

    // Calculate age from date of birth
    const age = calculateAge(userData.dob);

    // Prepare results
    const results = {
      rawText,
      aiExtractedData,
      fullName: `${userData.firstName} ${userData.lastName}`,
      age,
    };

    // Update results in database
    await updateProcessingResults(jobId, results);

    logger.info('Document processing completed successfully', { jobId });
  } catch (error) {
    logger.error(`Error processing document for job ${jobId}`, error);
    
    // Update status to failed
    const { error: updateError } = await supabase
      .from('document_processing_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
      })
      .eq('job_id', jobId);

    if (updateError) {
      logger.error('Failed to update error status:', updateError, { jobId });
    }
  }
}

module.exports = {
  processDocument,
};