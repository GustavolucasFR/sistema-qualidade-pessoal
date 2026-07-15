const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    console.log("=== Status of importador.zeus_consolidado ===");
    
    try {
        const r1 = await client.query('SELECT COUNT(*) as total FROM importador.zeus_consolidado');
        console.log('Total de Registros:', r1.rows[0].total);

        const r2 = await client.query('SELECT MIN(data_agendada_para_execu__o::date) as min_date, MAX(data_agendada_para_execu__o::date) as max_date FROM importador.zeus_consolidado');
        console.log('Período: de', r2.rows[0].min_date, 'até', r2.rows[0].max_date);

        const r3 = await client.query('SELECT status, COUNT(*) as count FROM importador.zeus_consolidado GROUP BY status ORDER BY count DESC');
        console.log('\nPor Status:');
        r3.rows.forEach(r => console.log(`  - ${r.status}: ${r.count}`));

        const r4 = await client.query('SELECT empresa, COUNT(*) as count FROM importador.zeus_consolidado GROUP BY empresa ORDER BY count DESC LIMIT 10');
        console.log('\nTop 10 Empresas:');
        r4.rows.forEach(r => console.log(`  - ${r.empresa}: ${r.count}`));

    } catch (e) {
        console.error("Erro na consulta:", e.message);
    }

    client.end();
}).catch(console.error);
