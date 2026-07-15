const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT data_agendada_para_execu__o::date as d, COUNT(*) FROM importador.zeus_consolidado WHERE UPPER(empresa) = 'TECNOMULTI' GROUP BY data_agendada_para_execu__o::date ORDER BY d DESC LIMIT 5")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
