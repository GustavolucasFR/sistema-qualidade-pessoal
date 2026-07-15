const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'postgres', password: 'postgres', port: 5432 });

const query = `
  SELECT 
    pd.tipo_de_atividade, 
    pd.estado, 
    pd.tecnologia, 
    pd.cidade, 
    pd.projeto_matrix__fibra_dedicada_,
    COUNT(*) as total_rows,
    SUM(CASE WHEN r.chave IS NULL THEN 1 ELSE 0 END) as sem_regra,
    SUM(COALESCE(r.receita_vivo, 0) + COALESCE(r.receita_fibrasil, 0)) as valor_total
  FROM importador.zeus_consolidado pd
  LEFT JOIN importador.regras_receita r ON UPPER(TRIM(r.chave)) = UPPER(
      TRIM(pd.tipo_de_atividade) || 
      TRIM(pd.estado) || 
      TRIM(pd.tecnologia) || 
      CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
      CASE 
        WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'não' THEN 'Não' 
        WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
        ELSE '-' 
      END
  )
  WHERE pd.data_agendada_para_execu__o::date >= '2026-06-21'
    AND pd.data_agendada_para_execu__o::date <= '2026-07-20'
    AND UPPER(TRIM(pd.empresa)) = 'TECNOMULTI'
    AND (pd.status ILIKE 'Conclu%')
  GROUP BY 
    pd.tipo_de_atividade, 
    pd.estado, 
    pd.tecnologia, 
    pd.cidade, 
    pd.projeto_matrix__fibra_dedicada_
  ORDER BY sem_regra DESC, total_rows DESC
  LIMIT 15;
`;

pool.query(query).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}).catch(console.error);
