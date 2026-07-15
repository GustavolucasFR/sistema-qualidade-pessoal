const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT SUM(producao_rs) as total FROM importador.fatos_dashboard WHERE data_execucao = '2026-07-12'")).then(res => { console.log('Revenue for 12/07:', res.rows[0].total); client.end(); }).catch(e => console.error(e));
