const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(async () => {
    let res = await client.query("SELECT pid FROM pg_stat_activity WHERE state = 'active' AND query ILIKE '%fatos_dashboard%'");
    for(let r of res.rows) {
        if(r.pid !== client.processID) {
            console.log(`Killing ${r.pid}`);
            await client.query(`SELECT pg_terminate_backend(${r.pid})`);
        }
    }
    client.end(); 
}).catch(e => console.error(e));
