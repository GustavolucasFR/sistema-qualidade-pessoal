const pool = require('../src/config/db'); 
const query = `
  WITH raw_data AS (
    SELECT 
      data_agendada_para_execu__o::date as data_base,
      (data_agendada_para_execu__o::text || ' ' || t_rmino_da_atividade)::timestamp as data_encerramento,
      data_de_cria__o_da_atividade::timestamp as data_abertura
    FROM importador.zeus_consolidado
    WHERE tipo_de_atividade ILIKE '%defeito%'
      AND (status ILIKE '%conclu%' OR status ILIKE '%cancel%')
      AND data_agendada_para_execu__o IS NOT NULL
      AND t_rmino_da_atividade IS NOT NULL
      AND data_de_cria__o_da_atividade IS NOT NULL
  )
  SELECT 
    data_base,
    AVG(EXTRACT(EPOCH FROM (data_encerramento - data_abertura))/3600) as tmr_horas,
    COUNT(*) as qtd
  FROM raw_data
  GROUP BY data_base
  ORDER BY data_base DESC
  LIMIT 10;
`;
pool.query(query).then(res => console.log(res.rows)).catch(console.error).finally(()=>pool.end());
