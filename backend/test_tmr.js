const pool = require('./src/config/db');

async function testTMR() {
    try {
        const today = new Date();
        const localTodayStr = today.getFullYear() + '-' +
          String(today.getMonth() + 1).padStart(2, '0') + '-' +
          String(today.getDate()).padStart(2, '0') + ' ' +
          String(today.getHours()).padStart(2, '0') + ':' +
          String(today.getMinutes()).padStart(2, '0') + ':' +
          String(today.getSeconds()).padStart(2, '0');

        const query = `
            SELECT 
              data_de_cria__o_da_atividade,
              t_rmino_da_atividade,
              data_agendada_para_execu__o,
              EXTRACT(EPOCH FROM (
                CASE 
                  WHEN t_rmino_da_atividade LIKE '%-%' THEN t_rmino_da_atividade::timestamp
                  ELSE (SUBSTRING(data_agendada_para_execu__o::text FROM 1 FOR 10) || ' ' || t_rmino_da_atividade)::timestamp
                END
              - data_de_cria__o_da_atividade::timestamp))/3600 as tmr_horas
            FROM importador.zeus_consolidado
            WHERE UPPER(TRIM(cidade)) = 'CARUARU'
              AND tipo_de_atividade ILIKE '%defeito%'
              AND (status ILIKE '%conclu%' OR status ILIKE '%cancel%')
              AND data_agendada_para_execu__o IS NOT NULL
              AND t_rmino_da_atividade IS NOT NULL
              AND data_de_cria__o_da_atividade IS NOT NULL
              AND TO_CHAR(data_agendada_para_execu__o::date, 'YYYY-MM') = TO_CHAR(TO_DATE(SUBSTRING($1 FROM 1 FOR 10), 'YYYY-MM-DD'), 'YYYY-MM')
            ORDER BY tmr_horas DESC
            LIMIT 10
        `;
        const { rows } = await pool.query(query, [localTodayStr]);
        console.log(rows);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
testTMR();
