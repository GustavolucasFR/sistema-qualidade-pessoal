const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'postgres', password: 'postgres', port: 5432 });

async function fixTypes() {
  try {
    const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'importador' AND table_name = 'backlogdiario_historico' AND data_type = 'character varying'");
    for (const row of rows) {
      console.log('Altering', row.column_name);
      await pool.query(`ALTER TABLE importador.backlogdiario_historico ALTER COLUMN "${row.column_name}" TYPE TEXT`);
    }
    console.log('OK');
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
fixTypes();
