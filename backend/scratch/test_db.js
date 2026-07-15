const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    try {
        let res = await pool.query("SELECT count(*) FROM importador.zeus_consolidado");
        console.log("Zeus total count:", res.rows[0].count);

        let viewdef = await pool.query("SELECT pg_get_viewdef('importador.fatos_dashboard', true) AS def");
        console.log("Fatos Dashboard view def:", viewdef.rows[0].def);

        let dashboardCount = await pool.query("SELECT count(*) FROM importador.fatos_dashboard");
        console.log("Fatos dashboard count:", dashboardCount.rows[0].count);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();
