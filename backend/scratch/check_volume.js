const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    let oldSql = `
        SELECT SUM(CASE WHEN pd.tipo_de_atividade ILIKE '%instalação%' OR pd.tipo_de_atividade ILIKE '%instalacao%'
                   OR pd.tipo_de_atividade ILIKE '%mudança%' OR pd.tipo_de_atividade ILIKE '%mudanca%'
                   OR pd.tipo_de_atividade ILIKE '%alteração%' OR pd.tipo_de_atividade ILIKE '%alteracao%'
              THEN 1 ELSE 0 END) as producao_vol
        FROM importador.zeus_consolidado pd
        WHERE UPPER(TRIM(pd.empresa)) = 'TECNOMULTI'
          AND pd.data_agendada_para_execu__o::date >= '2026-06-21' AND pd.data_agendada_para_execu__o::date <= '2026-07-20'
    `;

    let rOld = await pool.query(oldSql);
    console.log('Old Volume:', rOld.rows[0].producao_vol);

    let newSql = `
        SELECT SUM(is_produtivo) as total 
        FROM importador.fatos_dashboard
        WHERE data_execucao >= '2026-06-21' AND data_execucao <= '2026-07-20'
          AND is_cancelada = 0
          AND cluster_oficial IN ('NATAL', 'RECIFE', 'CARUARU', 'JOAO PESSOA')
    `;
    let rNew = await pool.query(newSql);
    console.log('New Volume:', rNew.rows[0].total);

    pool.end();
}
check();
