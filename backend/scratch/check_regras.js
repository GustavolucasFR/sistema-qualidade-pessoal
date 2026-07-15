const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    let r = await pool.query(`SELECT estado, tipo_de_atividade, receita_vivo FROM importador.regras_receita WHERE estado = 'Não Concluída' LIMIT 5`);
    console.table(r.rows);
    let r2 = await pool.query(`SELECT estado, tipo_de_atividade, receita_vivo FROM importador.regras_receita WHERE estado = 'Concluída' LIMIT 5`);
    console.table(r2.rows);
    pool.end();
}
check();
