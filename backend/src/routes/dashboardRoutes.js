const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const backlogController = require('../controllers/backlogController');
const producaoBaController = require('../controllers/producaoBaController');
const adminController = require('../controllers/adminController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Legado e Novo
router.get('/penalizacoes', dashboardController.getPenalizacoes);
router.get('/financeiro', dashboardController.getFinanceiro);
router.get('/kpis_operacionais', dashboardController.getKpis);
router.get('/operacional/todos', dashboardController.getOperacionalTodos);
router.get('/slas/ofensores', dashboardController.getSlasOfensores);
router.get('/slas/falhas/:tecnico', dashboardController.getSlasFalhasTecnico);
router.get('/tecnico/perfil/:tecnico', dashboardController.getPerfilTecnico);
router.get('/meses', dashboardController.getMesesDisponiveis);
router.get('/clusters/resumo', dashboardController.getClustersResumo);
router.get('/planos-acao', dashboardController.getPlanosAcao);
router.post('/planos-acao', dashboardController.postPlanosAcao);
router.put('/planos-acao/:id', dashboardController.updatePlanoAcao);
router.delete('/planos-acao/:id', dashboardController.deletePlanoAcao);
router.put('/planos-acao/:id/status', dashboardController.putPlanosAcao); // Legacy or specific
router.get('/planos-acao/:id/historico', dashboardController.getHistoricoPlano);
router.post('/planos-acao/:id/comentario', dashboardController.postComentarioPlano);
router.post('/planos-acao/:id/foto', upload.single('foto'), dashboardController.postFotoPlano);

router.get('/alertas', dashboardController.getAlertas);
router.get('/metas', dashboardController.getMetas);
router.get('/produtividade', dashboardController.getProdutividade);
router.get('/produtividade/detalhes', dashboardController.getProdutividadeDetalhes);
router.get('/backlog/datas', backlogController.getBacklogDatas);
router.get('/backlog/details', backlogController.getBacklogDetails);
router.get('/backlog', backlogController.getBacklogDashboard);
router.get('/producao-ba', producaoBaController.getProducaoBa);

router.get('/simulador-contrato', dashboardController.getSimuladorContrato);
router.get('/armarios-reparos', dashboardController.getArmariosReparos);
router.get('/heatmap', dashboardController.getHeatmapDados);

router.post('/admin/upload', upload.single('file'), adminController.uploadFile);

module.exports = router;
