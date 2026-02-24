const express = require('express');
const router = express.Router();

// GET endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Local route working!',
    timestamp: new Date().toISOString(),
    method: 'GET'
  });
});

// POST endpoint
router.post('/', (req, res) => {
  res.json({
    message: 'Data received',
    data: req.body,
    timestamp: new Date().toISOString(),
    method: 'POST'
  });
});

module.exports = router;
