const pool = require('../config/db');

exports.getDre = async (req, res) => {
    try {
        const targetMonth = req.query.mes ? parseInt(req.query.mes, 10) : null;
        let maxDQuery = `SELECT MAX(data_execucao) as d_max FROM importador.fatos_dashboard`;
        if (targetMonth) {
            maxDQuery = `SELECT make_date(2026, ${targetMonth}, 20)::date as d_max`;
        }

        const dreQuery = `
            WITH max_d AS (
                ${maxDQuery}
            ),
            cycle_dates AS (
                SELECT 
                    d_max,
                    CASE WHEN EXTRACT(DAY FROM d_max) >= 21 THEN
                        make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 21)
                    ELSE
                        make_date(EXTRACT(YEAR FROM (d_max - interval '1 month'))::int, EXTRACT(MONTH FROM (d_max - interval '1 month'))::int, 21)
                    END as ciclo_inicio,
                    CASE WHEN EXTRACT(DAY FROM d_max) >= 21 THEN
                        make_date(EXTRACT(YEAR FROM (d_max + interval '1 month'))::int, EXTRACT(MONTH FROM (d_max + interval '1 month'))::int, 20)
                    ELSE
                        make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 20)
                    END as ciclo_fim
                FROM max_d
            ),
            producao_consolidada AS (
                SELECT 
                    UPPER(TRIM(pd.cidade_raw)) as cidade,
                    SUM(pd.producao_rs) as producao_rs,
                    SUM(pd.receita_vivo) as producao_vivo,
                    SUM(pd.receita_fibrasil) as producao_fibrasil,
                    SUM(pd.producao_preventiva) as producao_preventiva,
                    SUM(pd.is_produtivo) as producao_vol
                FROM importador.fatos_dashboard pd
                CROSS JOIN cycle_dates
                WHERE pd.data_execucao >= cycle_dates.ciclo_inicio AND pd.data_execucao <= (SELECT MAX(data_execucao) FROM importador.fatos_dashboard)
                GROUP BY UPPER(TRIM(pd.cidade_raw))
            ),
            metas AS (
                SELECT 
                    UPPER(cidade) as cidade, 
                    SUM(meta_orcada) as meta_orcada 
                FROM importador.metas_dre
                ${targetMonth ? `WHERE mes_num = ${targetMonth}` : ''}
                GROUP BY UPPER(cidade)
            )
            SELECT 
                p.cidade,
                COALESCE(m.meta_orcada, 0) as orcamento,
                COALESCE(p.producao_rs, 0) as realizado,
                COALESCE(p.producao_vivo, 0) as producao_vivo,
                COALESCE(p.producao_fibrasil, 0) as producao_fibrasil,
                COALESCE(p.producao_preventiva, 0) as producao_preventiva,
                COALESCE(m.meta_orcada, 0) - COALESCE(p.producao_rs, 0) as deficit,
                CASE WHEN COALESCE(m.meta_orcada, 0) > 0 THEN (COALESCE(p.producao_rs, 0) / m.meta_orcada) * 100 ELSE 0 END as pct_realizado,
                CASE WHEN COALESCE(m.meta_orcada, 0) > 0 THEN ((COALESCE(m.meta_orcada, 0) - COALESCE(p.producao_rs, 0)) / m.meta_orcada) * 100 ELSE 0 END as pct_deficit,
                CASE WHEN COALESCE(p.producao_vol, 0) > 0 THEN COALESCE(p.producao_rs, 0) / p.producao_vol ELSE 0 END as ticket_medio,
                CASE 
                    WHEN UPPER(p.cidade) IN ('CARUARU', 'GARANHUNS', 'RECIFE', 'JABOATAO DOS GUARARAPES', 'OLINDA', 'VITORIA DE SANTO ANTAO', 'CAMARAGIBE', 'GRAVATA') THEN 'GERENCIA PE'
                    WHEN UPPER(p.cidade) IN ('CABEDELO', 'MOSSORO', 'PARNAMIRIM', 'PATOS', 'CAMPINA GRANDE', 'JOAO PESSOA', 'NATAL', 'SANTA RITA') THEN 'GERENCIA RN|PB'
                    ELSE 'OUTROS'
                END as gerencia
            FROM producao_consolidada p
            LEFT JOIN metas m ON UPPER(p.cidade) = m.cidade
            ORDER BY gerencia, p.cidade;
        `;

        const result = await pool.query(dreQuery);
        res.json(result.rows);

    } catch (err) {
        console.error('Erro ao buscar DRE:', err);
        res.status(500).json({ erro: 'Erro interno ao buscar DRE' });
    }
};
