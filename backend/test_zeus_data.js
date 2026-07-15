const pool = require('./src/config/db');
async function checkZeus() {
    try {
        const res = await pool.query(`
            SELECT t_rmino_da_atividade
            FROM importador.zeus_consolidado
            WHERE t_rmino_da_atividade NOT LIKE '%-%'
            LIMIT 5
        `);
        console.log("Without date:", res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkZeus();
