const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT SUM(receita_total) FROM importador.producao_ba_detalhado WHERE EXTRACT(MONTH FROM CASE WHEN EXTRACT(DAY FROM data::date) >= 21 THEN data::date + interval '1 month' ELSE data::date END) = 7 AND status = 'Concluída'")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
