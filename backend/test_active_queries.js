const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT pid, query FROM pg_stat_activity WHERE state = 'active'")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
