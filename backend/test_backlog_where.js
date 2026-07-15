const pool = require('./src/config/db');
async function testQuery() {
    try {
        const res = await pool.query(`
            SELECT COUNT(*)
            FROM importador.backlogdiario b
            WHERE b."STATUS" IN ('PENDENTE', 'AGENDADA', 'EXECUCAO')
            AND COALESCE(NULLIF(b."STATUS_REASON", ''), b."STATUS") != 'TRIAGEM'
            AND b."CLUSTER_" IS NOT NULL
            AND b."ARMARIO" IN (SELECT "ARMARIO" FROM importador.whitelist_armarios)
            AND b."PHYSICAL_LINK_MEDIA_TYPE" ILIKE 'GPON'
        `);
        console.log('Final count:', res.rows[0].count);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
testQuery();
