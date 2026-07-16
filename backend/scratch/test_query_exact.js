const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const query = `
        WITH backlog_aging AS (
          SELECT 
            b."CITY" as cluster,
            COALESCE(NULLIF(b."STATUS_REASON", ''), b."STATUS") as status_reason,
            EXTRACT(EPOCH FROM (TO_TIMESTAMP('2026-07-16', 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 as horas_aberto,
            'faixa' AS faixa_aging
          FROM importador.backlogdiario b
          WHERE b."STATUS" IN ('PENDENTE', 'AGENDADA', 'EXECUCAO')
            AND COALESCE(NULLIF(b."STATUS_REASON", ''), b."STATUS") != 'TRIAGEM'
            AND b."CLUSTER_" IS NOT NULL
            AND b."ARMARIO" IN (SELECT "ARMARIO" FROM importador.whitelist_armarios)
            AND b."PHYSICAL_LINK_MEDIA_TYPE" ILIKE 'GPON'
        ),
        categorias AS (
          SELECT 
            cluster,
            status_reason,
            faixa_aging,
            horas_aberto
          FROM backlog_aging
        )
        SELECT 
          cluster,
          status_reason,
          AVG(CASE WHEN COALESCE(NULLIF(status_reason, ''), '') NOT ILIKE '%preventiva%' THEN horas_aberto END) as tmr_horas
        FROM categorias
        GROUP BY cluster, status_reason
        LIMIT 5;
        `;
        const r1 = await client.query(query);
        console.table(r1.rows);
    } catch (e) { console.error(e.message); }
    client.end();
});
