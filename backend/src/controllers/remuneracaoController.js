const pool = require('../config/db');
const { calcularRemuneracao } = require('../services/remuneracaoService');

const getRemuneracao = async (req, res) => {
    try {
        const { cluster, mes } = req.query; 
        
        let tecnicos = [];
        const categorias = {
            'Em Desenvolvimento': 0,
            'Prata': 0,
            'Ouro': 0,
            'Diamante': 0
        };

        // Obter meses disponiveis
        const { rows: mesesRows } = await pool.query(`
            SELECT DISTINCT TO_CHAR(data_execucao, 'YYYY-MM') as mes
            FROM importador.resultados_sla_zeus
            WHERE data_execucao IS NOT NULL
            ORDER BY mes DESC
        `);
        const meses_disponiveis = mesesRows.map(r => r.mes);

        let slaParams = [];
        let slaFilter = '';
        if (mes && mes !== 'Todos') {
            slaFilter = "WHERE TO_CHAR(data_execucao, 'YYYY-MM') = $1";
            slaParams = [mes];
        }

        // Query para agregar resultados de SLA
        const { rows: slaRows } = await pool.query(`
            SELECT 
                UPPER(TRIM(tecnico)) as tecnico,
                COUNT(CASE WHEN UPPER(status) LIKE '%CONCLU%' OR UPPER(status) LIKE '%COMPLETA%' THEN 1 END) as os_concluidas,
                COUNT(CASE WHEN UPPER(status) LIKE '%CANCEL%' THEN 1 END) as os_canceladas,
                COUNT(CASE WHEN (UPPER(status) LIKE '%CONCLU%' OR UPPER(status) LIKE '%COMPLETA%') AND (EXTRACT(EPOCH FROM tempo_execucao::time) > EXTRACT(EPOCH FROM sla_alvo::time)) THEN 1 END) as sla_estourado
            FROM importador.resultados_sla_zeus
            ${slaFilter}
            GROUP BY UPPER(TRIM(tecnico))
        `, slaParams);
        
        const slaMap = {};
        slaRows.forEach(row => {
            slaMap[row.tecnico] = {
                os_concluidas: parseInt(row.os_concluidas, 10) || 0,
                os_canceladas: parseInt(row.os_canceladas, 10) || 0,
                sla_estourado: parseInt(row.sla_estourado, 10) || 0
            };
        });

        const { rows } = await pool.query(`
            SELECT 
                r.matricula,
                b.nome as tecnico,
                r.dias_trabalhados,
                r.pontos_baremo,
                r.ifi_pct,
                r.irr_pct
            FROM importador.remuneracao_oficial r
            LEFT JOIN importador.base_de_tecnicos b ON r.matricula = b.matricula
        `);

        rows.forEach((row) => {
            const nome = row.tecnico ? row.tecnico.toUpperCase().trim() : "Sem Nome";
            const matricula = row.matricula;
            const dias = parseFloat(row.dias_trabalhados) || 0;
            const pts = parseFloat(row.pontos_baremo) || 0;
            const ifi = parseFloat(row.ifi_pct) || 0;
            const irr = parseFloat(row.irr_pct) || 0;
            
            const slaStats = slaMap[nome] || { os_concluidas: 0, os_canceladas: 0, sla_estourado: 0 };
            
            // Instals e repairs default para 10 por enquanto
            tecnicos.push(calcularRemuneracao(nome, matricula, dias, pts, ifi, irr, 10, 10, categorias, slaStats));
        });

        tecnicos.sort((a, b) => b.total - a.total);

        const total_producao = tecnicos.reduce((acc, curr) => acc + curr.total, 0);
        const producao_base = tecnicos.reduce((acc, curr) => acc + curr.prod_rs, 0);

        res.json({
            totais: {
                total_producao,
                producao_base,
                total_tecnicos: tecnicos.length,
                meses_disponiveis,
                categorias
            },
            tecnicos
        });

    } catch (err) {
        console.error('Erro na rota /api/remuneracao:', err);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
};

module.exports = {
    getRemuneracao
};
