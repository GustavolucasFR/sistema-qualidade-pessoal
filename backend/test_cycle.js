const pool = require('./src/config/db');
pool.query(`
WITH max_d AS (SELECT make_date(2026, 6, 20)::date as d_max), 
cycle_dates AS (
  SELECT d_max, 
  CASE WHEN EXTRACT(DAY FROM d_max) >= 21 THEN make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 21) 
  ELSE make_date(EXTRACT(YEAR FROM (d_max - interval '1 month'))::int, EXTRACT(MONTH FROM (d_max - interval '1 month'))::int, 21) END as ciclo_inicio, 
  CASE WHEN EXTRACT(DAY FROM d_max) >= 21 THEN make_date(EXTRACT(YEAR FROM (d_max + interval '1 month'))::int, EXTRACT(MONTH FROM (d_max + interval '1 month'))::int, 20) 
  ELSE make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 20) END as ciclo_fim FROM max_d
) 
SELECT ciclo_inicio, ciclo_fim FROM cycle_dates
`).then(res => console.log(res.rows)).catch(console.error).finally(()=>pool.end());
