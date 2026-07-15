const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function checkEstado() {
    try {
        let res = await pool.query(`
            SELECT estado, count(*) 
            FROM importador.zeus_consolidado 
            GROUP BY estado
        `);
        console.log("Estado distribution in zeus_consolidado:", res.rows);

        let sumRes = await pool.query(`
            SELECT count(*), sum(producao_rs)
            FROM importador.fatos_dashboard
            WHERE estado IS NULL OR estado = '' OR estado = ' '
        `);
        console.log("Fatos Dashboard where estado is empty:", sumRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkEstado();
