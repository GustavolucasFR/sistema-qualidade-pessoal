const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT COUNT(*) FROM importador.fatos_dashboard WHERE receita_vivo > 0 OR receita_fibrasil > 0")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
