const express = require('express');
const router = express.Router();
const dreController = require('../controllers/dreController');

// GET /api/dre
router.get('/', dreController.getDre);

module.exports = router;
