// src/routes/health.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/health - Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const { data, error } = await supabase.from('document_processing_jobs').select('count').limit(1);
    
    if (error) {
      logger.error('Health check failed: Database connection error', error);
      return res.status(503).json({ 
        status: 'DOWN', 
        database: 'unavailable',
        message: 'Database connection failed' 
      });
    }
    
    res.status(200).json({ 
      status: 'OK', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({ 
      status: 'DOWN', 
      message: 'Service unavailable' 
    });
  }
});

module.exports = router;