const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT data_execucao, SUM(producao_rs) as total, COUNT(*) as c FROM importador.fatos_dashboard GROUP BY data_execucao ORDER BY data_execucao DESC")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
