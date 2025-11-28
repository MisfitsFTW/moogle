const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');

// Health check endpoint
router.get('/health', (req, res) => queryController.getHealth(req, res));

// Main query endpoint
router.post('/query', (req, res) => queryController.processQuery(req, res));

module.exports = router;
