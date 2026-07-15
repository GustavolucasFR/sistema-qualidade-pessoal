const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    const dmax = "make_date(2026, 7, 20)::date";

    const oldSql = `
      WITH max_d AS (
          SELECT ${dmax} as d_max
      ),
      cycle_dates AS (
          SELECT 
              d_max,
              make_date(EXTRACT(YEAR FROM (d_max - interval '1 month'))::int, EXTRACT(MONTH FROM (d_max - interval '1 month'))::int, 21) as ciclo_inicio,
              make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 20) as ciclo_fim
          FROM max_d
      ),
      working_days AS (
          SELECT c.cidade, gs.d::date as d
          FROM (SELECT DISTINCT cidade FROM importador.zeus_consolidado WHERE cidade IS NOT NULL) c
          CROSS JOIN cycle_dates
          CROSS JOIN generate_series(ciclo_inicio, ciclo_fim, interval '1 day') gs(d)
          WHERE EXTRACT(ISODOW FROM gs.d) != 7
            AND NOT EXISTS (
                SELECT 1 FROM importador.feriados_cidade f
                WHERE UPPER(TRIM(f.cidade)) = UPPER(TRIM(c.cidade)) 
                  AND f.data_feriado = gs.d::date
            )
      ),
      remaining_working_days AS (
          SELECT 
              cidade,
              COUNT(CASE WHEN d > (SELECT d_max FROM cycle_dates) THEN 1 END) as r_days 
          FROM working_days
          GROUP BY cidade
      ),
      last_6_wd AS (
          SELECT cidade, d
          FROM (
              SELECT cidade, d, ROW_NUMBER() OVER (PARTITION BY cidade ORDER BY d DESC) as rn
              FROM working_days
              WHERE d <= LEAST((SELECT d_max FROM cycle_dates), (SELECT MAX(data_agendada_para_execu__o::date) FROM importador.zeus_consolidado))
          ) t WHERE rn <= 6
      )
      SELECT 
          SUM(CASE WHEN pd.tipo_de_atividade ILIKE '%instalação%' OR pd.tipo_de_atividade ILIKE '%instalacao%'
                   OR pd.tipo_de_atividade ILIKE '%mudança%' OR pd.tipo_de_atividade ILIKE '%mudanca%'
                   OR pd.tipo_de_atividade ILIKE '%alteração%' OR pd.tipo_de_atividade ILIKE '%alteracao%'
              THEN 1 ELSE 0 END) as producao_vol,
          SUM(COALESCE(re.receita_vivo, r.receita_vivo, 0) + COALESCE(re.receita_fibrasil, r.receita_fibrasil, 0)) as producao_rs
      FROM importador.zeus_consolidado pd
      CROSS JOIN cycle_dates
      LEFT JOIN remaining_working_days rwd ON rwd.cidade = pd.cidade
      LEFT JOIN last_6_wd l6 ON l6.cidade = pd.cidade AND l6.d = pd.data_agendada_para_execu__o::date
      LEFT JOIN importador.tecnicos t ON t.mat_vivo::text = pd.login_tecnico::text
      LEFT JOIN importador.regras_receita_extra re ON UPPER(TRIM(re.chave)) = UPPER(
          TRIM(pd.tipo_de_atividade) || TRIM(pd.estado) || TRIM(pd.tecnologia) || 
          CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
          CASE 
              WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'não' THEN 'Não'
              WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) IN ('sim', 'sim parcialmente', 'sim - parcial') THEN 'Sim'
              ELSE '-'
          END ||
          CASE 
              WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'não' THEN 'Não' 
              WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
              ELSE '-' 
          END
      )
      LEFT JOIN importador.regras_receita r ON UPPER(TRIM(r.chave)) = UPPER(
          TRIM(pd.tipo_de_atividade) || TRIM(pd.estado) || TRIM(pd.tecnologia) || 
          CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
          CASE 
              WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'não' THEN 'Não' 
              WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
              ELSE '-' 
          END
      )
      WHERE UPPER(TRIM(pd.empresa)) = 'TECNOMULTI'
        AND pd.data_agendada_para_execu__o::date BETWEEN cycle_dates.ciclo_inicio AND cycle_dates.ciclo_fim
    `;

    let rOld = await pool.query(oldSql);
    console.log('Old Query Sum:', rOld.rows[0].producao_rs);

    let newSql = `
        SELECT SUM(producao_rs) as total 
        FROM importador.fatos_dashboard
        WHERE data_execucao >= '2026-06-21' AND data_execucao <= '2026-07-20'
          AND is_cancelada = 0
          AND cluster_oficial IN ('NATAL', 'RECIFE', 'CARUARU', 'JOAO PESSOA')
    `;
    let rNew = await pool.query(newSql);
    console.log('New Query Sum:', rNew.rows[0].total);

    pool.end();
}
check();
