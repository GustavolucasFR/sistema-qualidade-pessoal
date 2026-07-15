const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function analyze() {
    try {
        let res = await pool.query(`
            SELECT status, count(*) 
            FROM importador.zeus_consolidado 
            GROUP BY status
        `);
        console.log("Status distribution:", res.rows);

        let dupes = await pool.query(`
            SELECT n_mero_da_ordem_de_servi_o, count(*) 
            FROM importador.zeus_consolidado 
            GROUP BY n_mero_da_ordem_de_servi_o 
            HAVING count(*) > 1 
            LIMIT 10
        `);
        console.log("Duplicate OS example:", dupes.rows);

        let sumBA = await pool.query(`SELECT sum(producao_rs) FROM importador.fatos_dashboard`);
        console.log("Total BA (producao_rs):", sumBA.rows[0].sum);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
analyze();
