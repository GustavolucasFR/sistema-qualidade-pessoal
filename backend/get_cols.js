const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'postgres', password: 'postgres', port: 5432 });

pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='importador' AND table_name='zeus_consolidado';`)
    .then(r => {
        console.log(r.rows.map(x => x.column_name).join(', '));
        pool.end();
    });
