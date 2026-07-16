const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Rota para o chat da IA
router.post('/ask', aiController.askAssistant);

module.exports = router;
