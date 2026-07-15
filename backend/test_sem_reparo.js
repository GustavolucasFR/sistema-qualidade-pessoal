const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT cidade_raw, SUM(producao_rs) as sem_reparo FROM importador.fatos_dashboard WHERE mes_ciclo = 7 AND producao_rs != 157.22 AND producao_rs != 148.08 AND producao_rs != 153.45 GROUP BY cidade_raw ORDER BY cidade_raw")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
