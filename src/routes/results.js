// backend/routes/results.js
const express = require('express');
const { getProcessingResult, getAllProcessingJobs, deleteProcessingJob } = require('../services/supabaseService');

const router = express.Router();

// GET /api/results - Get all processing jobs
router.get('/', async (req, res, next) => {
  try {
    const jobs = await getAllProcessingJobs();
    res.status(200).json({ jobs });
  } catch (error) {
    next(error);
  }
});

// GET /api/results/:jobId - Retrieve processing results for a specific job
router.get('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const result = await getProcessingResult(jobId);
    
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/results/:jobId/document - Serve the original document
router.get('/:jobId/document', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const result = await getProcessingResult(jobId);
    
    if (!result || !result.fileUrl) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Return the file URL for the frontend to display
    res.status(200).json({ 
      fileUrl: result.fileUrl,
      fileName: result.fileName,
      mimeType: result.mimeType
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/results/:jobId - Delete a processing job
router.delete('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const deleted = await deleteProcessingJob(jobId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;