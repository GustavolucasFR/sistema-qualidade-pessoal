require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const remuneracaoRoutes = require('./routes/remuneracaoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const produtividadeKpiRoutes = require('./routes/produtividadeKpiRoutes');
const dreRoutes = require('./routes/dreRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Middleware
const { verifyToken } = require('./middlewares/authMiddleware');

// Rotas publicas
app.use('/api/auth', authRoutes);

// Proteger todas as outras rotas da API
app.use('/api', verifyToken);

// Rotas protegidas modulares
app.use('/api/remuneracao', remuneracaoRoutes);
app.use('/api', dashboardRoutes); // Monta as rotas antigas na mesma base (/api/penalizacoes, etc)
app.use('/api/kpis', produtividadeKpiRoutes);
app.use('/api/dre', dreRoutes);
app.use('/api/ai', aiRoutes);

// Rotas protegidas legadas (que ainda estao no server.js)
const pool = require('./config/db');

app.get('/api/etl/status', async (req, res) => {
    try {
        const query = 'SELECT * FROM importador.vw_monitoramento_importacoes ORDER BY data_importacao DESC LIMIT 20';
        const { rows } = await pool.query(query);
        res.json(rows || []);
    } catch (err) {
        if (err.code === '42P01') {
            return res.json([]);
        }
        res.status(500).json({ erro: 'Falha ao buscar status ETL.' });
    }
});

app.post('/api/etl/consolidar-zeus', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Remover registros no consolidado que já estão na tabela de importação zeus (para evitar duplicidade de importações acumuladas)
        await client.query(`
            DELETE FROM importador.zeus_consolidado 
            WHERE n_mero_da_ordem_de_servi_o IN (SELECT n_mero_da_ordem_de_servi_o FROM importador.zeus)
        `);

        // 2. Mover tudo para o consolidado
        const insertQuery = 'INSERT INTO importador.zeus_consolidado SELECT * FROM importador.zeus';
        const result = await client.query(insertQuery);
        
        // 3. Atualizar Motor Central (fatos_dashboard)
        await client.query('REFRESH MATERIALIZED VIEW importador.fatos_dashboard');
        
        // 4. Limpar a tabela diaria
        await client.query('TRUNCATE importador.zeus');
        
        await client.query('COMMIT');
        
        res.json({ success: true, message: 'Zeus consolidado com sucesso!', registrosMovidos: result.rowCount });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao consolidar zeus:', err);
        res.status(500).json({ error: 'Erro interno ao consolidar zeus', detalhe: err.message });
    } finally {
        client.release();
    }
});

// A rota /api/operacional/jun ainda e chamada por alguns cantos do front?
// O front ja usa /api/dashboard/operacional/todos, entao eu criei ali. Mas vou manter uma copia retrocompativel aqui
app.get('/api/operacional/jun', async (req, res) => {
    res.redirect('/api/dashboard/operacional/todos');
});

// As restantes rotas antigas podem ser movidas gradualmente, o mais importante foi limpar o server.js das maiores e proteger todas.

// Agendador do Scraper de Backlog (Roda a cada 1 hora e 10 minutos = 70 minutos = 4200000 ms)
const { exec } = require('child_process');
const scraperInterval = 70 * 60 * 1000;
setInterval(() => {
    console.log(`[Scheduler] Iniciando extração automática do ELOS Backlog...`);
    const scraperPath = path.join(__dirname, '../scraper_elos_backlog.js');
    exec(`node "${scraperPath}"`, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Scheduler] Erro no scraper ELOS:`, error.message);
            return;
        }
        console.log(`[Scheduler] Scraper ELOS executado com sucesso e banco atualizado!`);
    });
}, scraperInterval);

app.listen(PORT, () => {
    console.log(`🚀 API do Sistema de Qualidade rodando na porta ${PORT} (Protegida com JWT)`);
    console.log(`📡 Rota de Login: http://localhost:${PORT}/api/auth/login`);
});
