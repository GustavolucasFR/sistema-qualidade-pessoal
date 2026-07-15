const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT 
        COALESCE(UPPER(macro_ativdade), '') || '_' || 
        COALESCE(UPPER(ptbaremo), '') || '_' || 
        COALESCE(UPPER(cidade), '') || '_' || 
        COALESCE(UPPER(empresa), '') as chave,
        COUNT(*) as qty,
        SUM(COALESCE(receita_vivo, 0)) as soma_receita_vivo,
        SUM(COALESCE(receita_fibrasil, 0)) as soma_receita_fibrasil
      FROM importador.producao_ba
      WHERE data_agendada_para_execucao >= '2026-07-01'
      AND NOT EXISTS (
        SELECT 1 FROM importador.regras_receita r 
        WHERE r.chave = COALESCE(UPPER(macro_ativdade), '') || '_' || 
                        COALESCE(UPPER(ptbaremo), '') || '_' || 
                        COALESCE(UPPER(cidade), '') || '_' || 
                        COALESCE(UPPER(empresa), '')
      )
      GROUP BY 1
      ORDER BY qty DESC
    `);
    console.log("Missing keys:");
    console.log(res.rows);

    const res2 = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        SUM(COALESCE(receita_vivo, 0) + COALESCE(receita_fibrasil, 0)) as soma_receita_original,
        SUM(COALESCE(r.receita_vivo, 0) + COALESCE(r.receita_fibrasil, 0)) as soma_receita_regras
      FROM importador.producao_ba t
      LEFT JOIN importador.regras_receita r ON r.chave = (
        COALESCE(UPPER(t.macro_ativdade), '') || '_' || 
        COALESCE(UPPER(t.ptbaremo), '') || '_' || 
        COALESCE(UPPER(t.cidade), '') || '_' || 
        COALESCE(UPPER(t.empresa), '')
      )
      WHERE t.data_agendada_para_execucao >= '2026-07-01'
    `);
    console.log("Stats for July:");
    console.log(res2.rows);

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
main();
