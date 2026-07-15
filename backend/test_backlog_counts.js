const pool = require('./src/config/db');
pool.query('SELECT COUNT(*) FROM importador.backlogdiario').then(res => console.log('Total backlogdiario:', res.rows[0].count)).catch(console.error);

pool.query('SELECT COUNT(*) FROM importador.whitelist_armarios').then(res => console.log('Total whitelist_armarios:', res.rows[0].count)).catch(console.error).finally(() => pool.end());
