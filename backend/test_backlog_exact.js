const pool = require('./src/config/db');

async function testAggregatedQuery() {
    try {
        const today = new Date();
        const localTodayStr = today.getFullYear() + '-' +
          String(today.getMonth() + 1).padStart(2, '0') + '-' +
          String(today.getDate()).padStart(2, '0') + ' ' +
          String(today.getHours()).padStart(2, '0') + ':' +
          String(today.getMinutes()).padStart(2, '0') + ':' +
          String(today.getSeconds()).padStart(2, '0');

        const megaClusterCol = 'b."CLUSTER_"'; // test for cluster/cidade, actually city mode uses b."CLUSTER_" as mega and b."CITY" as cluster, but whatever
        const clusterCol = 'b."CITY"';

        const query = `
            WITH backlog_aging AS (
            SELECT 
                \${megaClusterCol} as mega_cluster,
                \${clusterCol} as cluster,
                COALESCE(NULLIF(b."STATUS_REASON", ''), b."STATUS") as status_reason,
                EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 as horas_aberto,
                CASE 
                WHEN b."DATA_VENCIMENTO" IS NOT NULL AND TO_DATE(b."DATA_VENCIMENTO", 'DD/MM/YYYY') = TO_DATE(SUBSTRING($1 FROM 1 FOR 10), 'YYYY-MM-DD') THEN 'agenda_hoje'
                WHEN EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 24 THEN 'menor_24h'
                WHEN EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 24 AND EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 48 THEN 'entre_24_48h'
                WHEN EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 48 AND EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 72 THEN 'entre_48_72h'
                WHEN EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 72 AND EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 120 THEN 'maior_3_dias'
                WHEN EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 120 THEN 'maior_5_dias'
                ELSE 'Desconhecido'
                END AS faixa_aging
            FROM importador.backlogdiario b
            WHERE b."STATUS" IN ('PENDENTE', 'AGENDADA', 'EXECUCAO')
                AND COALESCE(NULLIF(b."STATUS_REASON", ''), b."STATUS") != 'TRIAGEM'
                AND b."CLUSTER_" IS NOT NULL
                AND b."ARMARIO" IN (SELECT "ARMARIO" FROM importador.whitelist_armarios)
                AND b."PHYSICAL_LINK_MEDIA_TYPE" ILIKE 'GPON'
            ),
            categorias AS (
            SELECT 
                mega_cluster,
                cluster,
                status_reason,
                faixa_aging,
                horas_aberto
            FROM backlog_aging
            )
            SELECT 
            mega_cluster,
            cluster,
            status_reason,
            COUNT(CASE WHEN faixa_aging = 'agenda_hoje' THEN 1 END) AS agenda_hoje,
            COUNT(CASE WHEN faixa_aging = 'menor_24h' THEN 1 END) AS menor_24h,
            COUNT(CASE WHEN faixa_aging = 'entre_24_48h' THEN 1 END) AS entre_24_48h,
            COUNT(CASE WHEN faixa_aging = 'entre_48_72h' THEN 1 END) AS entre_48_72h,
            COUNT(CASE WHEN faixa_aging = 'maior_3_dias' THEN 1 END) AS maior_3_dias,
            COUNT(CASE WHEN faixa_aging = 'maior_5_dias' THEN 1 END) AS maior_5_dias,
            COUNT(*) AS total_abertas,
            AVG(CASE WHEN COALESCE(NULLIF(status_reason, ''), '') NOT ILIKE '%preventiva%' THEN horas_aberto END) as tmr_horas
            FROM categorias
            GROUP BY mega_cluster, cluster, status_reason
            ORDER BY mega_cluster ASC, cluster ASC, status_reason ASC;
        `.replace(/\$\{megaClusterCol\}/g, megaClusterCol).replace(/\$\{clusterCol\}/g, clusterCol);

        const { rows } = await pool.query(query, [localTodayStr]);
        console.log('Query returned rows:', rows.length);
        if (rows.length > 0) {
            console.log('Sample row:', rows[0]);
        }
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
testAggregatedQuery();
