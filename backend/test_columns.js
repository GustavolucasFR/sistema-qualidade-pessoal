const pool = require('./src/config/db');
async function checkColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'importador' AND table_name = 'metricas_tdna'
        `);
        console.log("TDNA:", res.rows.map(r => r.column_name));

        const res2 = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'importador' AND table_name = 'metricas_produtividade'
        `);
        console.log("Produtividade:", res2.rows.map(r => r.column_name));
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkColumns();
