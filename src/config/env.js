// src/config/env.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

const optionalEnvVars = [
  'GEMINI_API_KEY',
  'PORT'
];

// Validate required environment variables
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

// Set default values for optional environment variables
const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  uploadLimit: process.env.UPLOAD_LIMIT || '10mb'
};

// Log configuration in development
if (config.nodeEnv === 'development') {
  console.log('Environment configuration:', {
    ...config,
    supabaseKey: config.supabaseKey ? '***' : 'missing'
  });
}

module.exports = config;