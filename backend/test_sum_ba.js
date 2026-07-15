const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT SUM(receita_total) FROM importador.producao_ba_detalhado WHERE EXTRACT(MONTH FROM CASE WHEN EXTRACT(DAY FROM data_agendada_para_execu__o::date) >= 21 THEN data_agendada_para_execu__o::date + interval '1 month' ELSE data_agendada_para_execu__o::date END) = 7")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
