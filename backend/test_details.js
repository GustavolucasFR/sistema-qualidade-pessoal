const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT SUM(producao_preventiva) as prev, SUM(CASE WHEN macro_ativdade = 'REPARO' THEN producao_rs ELSE 0 END) as rep, SUM(CASE WHEN macro_ativdade != 'REPARO' AND producao_preventiva = 0 THEN producao_rs ELSE 0 END) as rec FROM importador.fatos_dashboard WHERE mes_ciclo = 7")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
