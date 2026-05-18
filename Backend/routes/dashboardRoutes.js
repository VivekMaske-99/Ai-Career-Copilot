const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Protected history
router.get('/history', auth, dashboardController.history);

module.exports = router;
