const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    const r = await client.query('SELECT COUNT(*) as total FROM importador.zeus_consolidado');
    console.log('Total zeus_consolidado:', r.rows[0].total);

    const r2 = await client.query(`SELECT COUNT(*) as total FROM importador.zeus_consolidado WHERE UPPER(TRIM(empresa)) = 'TECNOMULTI'`);
    console.log('Total TECNOMULTI:', r2.rows[0].total);

    // Check if producao_ba_detalhado uses the sum logic
    const r3 = await client.query(`
        SELECT SUM(receita_vivo) as vivo, SUM(receita_fibrasil) as fibra, SUM(receita_total) as total
        FROM importador.producao_ba_detalhado 
        WHERE status = 'Concluída' 
          AND UPPER(TRIM(empresa)) = 'TECNOMULTI'
          AND EXTRACT(MONTH FROM 
              CASE WHEN EXTRACT(DAY FROM data::date) >= 21 
                   THEN data::date + interval '1 month' 
                   ELSE data::date 
              END
          ) = 7
    `);
    console.log('BA July - vivo:', r3.rows[0].vivo, '| fibra:', r3.rows[0].fibra, '| total:', r3.rows[0].total);

    // Check fatos_dashboard with the same breakdown
    const r4 = await client.query(`
        SELECT SUM(receita_vivo) as vivo, SUM(receita_fibrasil) as fibra, SUM(producao_rs) as total
        FROM importador.fatos_dashboard 
        WHERE mes_ciclo = 7 AND status = 'Concluída'
    `);
    console.log('FD July - vivo:', r4.rows[0].vivo, '| fibra:', r4.rows[0].fibra, '| total:', r4.rows[0].total);

    client.end();
}).catch(console.error);
