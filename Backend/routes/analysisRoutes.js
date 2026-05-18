const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const analysisController = require('../controllers/analysisController');

// GET /api/analysis/:id  - protected
router.get('/:id', auth, analysisController.getById);

module.exports = router;
