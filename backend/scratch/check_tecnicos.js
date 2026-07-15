const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'importador' AND table_name IN ('tecnicos', 'base_de_tecnicos')
        `);
        console.log("Colunas de tecnicos/base_de_tecnicos:");
        r.rows.forEach(row => console.log(row.column_name));
        
        const r2 = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'importador' AND table_name = 'zeus_consolidado'
            AND column_name ILIKE '%tecni%'
        `);
        console.log("Colunas de tecnico em zeus_consolidado:");
        r2.rows.forEach(row => console.log(row.column_name));

    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
