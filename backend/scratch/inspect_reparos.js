const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

async function inspect() {
  try {
    const res1 = await pool.query(`SELECT tipo_de_atividade, COUNT(*) FROM importador.zeus_consolidado GROUP BY 1 ORDER BY 2 DESC LIMIT 10`);
    console.log("Zeus Atividades:");
    console.table(res1.rows);

    const res2 = await pool.query(`SELECT categorizes_type, COUNT(*) FROM importador.backlogdiario_historico GROUP BY 1 ORDER BY 2 DESC LIMIT 10`);
    console.log("Backlog Categorizes Type:");
    console.table(res2.rows);

    const res3 = await pool.query(`SELECT id_de_arm_rio, COUNT(*) FROM importador.zeus_consolidado WHERE tipo_de_atividade ILIKE '%reparo%' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`);
    console.log("Zeus Armarios mais reparos:");
    console.table(res3.rows);

    const res4 = await pool.query(`SELECT armario, COUNT(*) FROM importador.backlogdiario_historico WHERE categorizes_type ILIKE '%reparo%' GROUP BY 1 ORDER BY 2 DESC LIMIT 10`);
    console.log("Backlog Armarios mais reparos:");
    console.table(res4.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

inspect();
