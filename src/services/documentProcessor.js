// src/services/documentProcessor.js
const { v4: uuidv4 } = require('uuid');
const { extractTextFromPDF } = require('./pdfExtractor');
const { extractTextFromImage } = require('./imageExtractor');
const { processWithAI } = require('./aiProcessor');
const { calculateAge } = require('./utils');
const { storeFile, storeDocumentMetadata, updateProcessingResults } = require('./supabaseService');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

// Initialize Supabase client for error handling
const supabaseUrl = process.env.SUPABASE_URL || "https://biklzpyuarncssdbwfmk.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    logger.info('Starting async document processing', { jobId, processingMethod });
    
    // Start async processing but don't wait for it to complete
    processDocumentAsync(jobId, file, userData, processingMethod, fileUrl).catch(error => {
      logger.error('Async document processing failed', { jobId, error: error.message });
    });

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
      try {
        rawText = await extractTextFromPDF(file.buffer);
        logger.info('PDF text extraction completed', { jobId, textLength: rawText.length });
        
        // Ensure we have some text, even if it's just an error message
        if (!rawText || rawText.trim().length === 0) {
          rawText = 'PDF text extraction completed but no readable text was found.';
        }
      } catch (pdfError) {
        logger.error('PDF text extraction failed', { jobId, error: pdfError.message });
        // Don't fail completely, use a fallback message
        rawText = `PDF processing encountered an issue: ${pdfError.message}`;
      }
    } else if (file.mimetype.startsWith('image/')) {
      logger.info('Extracting text from image', { jobId });
      try {
        rawText = await extractTextFromImage(file.buffer);
        logger.info('Image text extraction completed', { jobId, textLength: rawText.length });
        
        if (!rawText || rawText.trim().length === 0) {
          rawText = 'Image text extraction completed but no readable text was found.';
        }
      } catch (imageError) {
        logger.error('Image text extraction failed', { jobId, error: imageError.message });
        rawText = `Image processing encountered an issue: ${imageError.message}`;
      }
    } else {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    logger.info('Text extraction completed', { 
      jobId, 
      textLength: rawText.length,
      processingMethod 
    });

    let aiExtractedData = null;
    
    // Process with AI if selected - PASS THE PROVIDED DOB
    if (processingMethod === 'ai') {
      try {
        logger.info('Starting AI processing', { jobId });
        aiExtractedData = await processWithAI(rawText, userData.dob);
        logger.info('AI processing completed successfully', { jobId, hasData: !!aiExtractedData });
      } catch (aiError) {
        logger.error('AI processing failed', { jobId, error: aiError.message });
        // Continue with standard processing instead of failing completely
        aiExtractedData = null;
      }
    }

    // Calculate age from the provided date of birth (not from document)
    const age = calculateAge(userData.dob);

    // Prepare results - ensure we always have some content
    const results = {
      rawText: rawText || 'No text could be extracted from the document.',
      aiExtractedData,
      fullName: `${userData.firstName} ${userData.lastName}`,
      age,
    };

    // Update results in database
    await updateProcessingResults(jobId, results);

    logger.info('Document processing completed successfully', { jobId, textLength: rawText.length });
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
  processDocumentAsync,
};