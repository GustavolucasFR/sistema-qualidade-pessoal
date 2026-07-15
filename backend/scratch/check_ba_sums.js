const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    const dmax = "make_date(2026, 7, 20)::date";

    const cte = `
        WITH max_d AS (SELECT ${dmax} as d_max),
        cycle_dates AS (
            SELECT 
                d_max,
                make_date(EXTRACT(YEAR FROM (d_max - interval '1 month'))::int, EXTRACT(MONTH FROM (d_max - interval '1 month'))::int, 21) as ciclo_inicio,
                make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 20) as ciclo_fim
            FROM max_d
        )
    `;

    // 1: New BA without preventiva
    let q1 = cte + `
        SELECT SUM(receita_vivo + receita_fibrasil) as total FROM importador.fatos_dashboard pd
        CROSS JOIN cycle_dates
        WHERE pd.empresa = 'TECNOMULTI' 
        AND pd.data_execucao >= cycle_dates.ciclo_inicio
        AND pd.data_execucao <= cycle_dates.ciclo_fim
        AND pd.is_cancelada = 0
        AND pd.cluster_oficial IN ('NATAL', 'RECIFE', 'CARUARU', 'JOAO PESSOA')
    `;
    let r1 = await pool.query(q1);
    console.log('New BA (Canceladas=0, Valid Clusters, No Prev):', r1.rows[0].total);

    // 2: Old BA logic?
    let q2 = cte + `
        SELECT SUM(receita_vivo + receita_fibrasil) as total FROM importador.fatos_dashboard pd
        CROSS JOIN cycle_dates
        WHERE pd.empresa = 'TECNOMULTI' 
        AND pd.data_execucao >= cycle_dates.ciclo_inicio
        AND pd.data_execucao <= cycle_dates.ciclo_fim
        AND pd.cluster_oficial IN ('NATAL', 'RECIFE', 'CARUARU', 'JOAO PESSOA')
    `;
    let r2 = await pool.query(q2);
    console.log('Old BA (All, Valid Clusters, No Prev):', r2.rows[0].total);

    pool.end();
}
check();
