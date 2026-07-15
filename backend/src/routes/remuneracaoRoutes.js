const express = require('express');
const router = express.Router();
const { getRemuneracao } = require('../controllers/remuneracaoController');

router.get('/', getRemuneracao);

module.exports = router;
