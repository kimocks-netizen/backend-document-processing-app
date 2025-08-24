// backend/server.js
const express = require('express');
const path = require('path');
require('dotenv').config();

// Import middleware
const cors = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');
const uploadLimiter = require('./middleware/uploadLimiter');

// Import routes
const uploadRoutes = require('./routes/upload');
const resultsRoutes = require('./routes/results');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to upload routes
app.use('/api/upload', uploadLimiter);

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/health', healthRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/.next')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/.next', 'index.html'));
  });
}

// Error handling middleware (should be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;