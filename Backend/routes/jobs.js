const express = require('express');
const router = express.Router();
const db = require('../db');

// Test route
router.get('/test', async (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Get all jobs
router.get('/jobs', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM jobs');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;