const express = require('express');
const router = express.Router();
const produtividadeKpiController = require('../controllers/produtividadeKpiController');

router.get('/tma', produtividadeKpiController.getTMA);
router.get('/tdna', produtividadeKpiController.getTDNA);
router.get('/tmr', produtividadeKpiController.getTMR);
router.get('/consolidado', produtividadeKpiController.getProdutividade);

module.exports = router;
