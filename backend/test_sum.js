const pool = require('./src/config/db');
pool.query(`SELECT SUM(producao_rs) FROM importador.fatos_dashboard WHERE data_execucao >= '2026-05-21' AND data_execucao <= '2026-06-20'`)
.then(res => console.log(res.rows))
.catch(console.error)
.finally(()=>pool.end());
