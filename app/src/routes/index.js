const express = require('express');
const router = express.Router();
const db = require('../db');

const dashboardRoutes = require('./dashboardRoutes');
const projectRoutes = require('./projectRoutes');
const taskRoutes = require('./taskRoutes');
const userRoutes = require('./userRoutes');

// Healthcheck endpoint for Docker or uptime monitoring
router.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT 1 as healthy');
    return res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (error) {
    return res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

// Mount application routes
router.use('/', dashboardRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);

module.exports = router;
