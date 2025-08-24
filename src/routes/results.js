// src/routes/results.js
const express = require('express');
const { getProcessingResult } = require('../services/supabaseService');

const router = express.Router();

// GET /api/results/:jobId - Retrieve processing results
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

module.exports = router;