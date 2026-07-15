const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT COUNT(*) FROM importador.fatos_dashboard WHERE data_execucao = '2026-07-12'")).then(res => { console.log('Rows for 12/07:', res.rows[0].count); client.end(); }).catch(e => console.error(e));
