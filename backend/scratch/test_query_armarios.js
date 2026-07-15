const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

async function getArmariosReparo() {
  try {
    const res = await pool.query(`
      SELECT id_de_arm_rio as armario, count(*) as qtd_reparos 
      FROM importador.zeus_consolidado 
      WHERE tipo_de_atividade ILIKE '%defeito%' 
        AND id_de_arm_rio IS NOT NULL 
        AND id_de_arm_rio != ''
      GROUP BY id_de_arm_rio 
      ORDER BY qtd_reparos DESC 
      LIMIT 10
    `);
    console.log("Top 10 Armários com mais reparos:");
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

getArmariosReparo();
