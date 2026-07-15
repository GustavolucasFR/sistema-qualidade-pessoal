const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    let r = await pool.query(`SELECT chave, count(*) FROM importador.regras_receita GROUP BY chave HAVING count(*) > 1`);
    console.log('regras_receita dupes:', r.rows);
    r = await pool.query(`SELECT chave, count(*) FROM importador.regras_receita_extra GROUP BY chave HAVING count(*) > 1`);
    console.log('regras_receita_extra dupes:', r.rows);
    r = await pool.query(`SELECT chave_prev, count(*) FROM importador.regras_preventiva GROUP BY chave_prev HAVING count(*) > 1`);
    console.log('regras_preventiva dupes:', r.rows);
    pool.end();
}
check();
