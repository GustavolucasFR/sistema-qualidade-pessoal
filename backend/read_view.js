const { Pool } = require('pg'); 
const pool = new Pool({user:'postgres',password:'postgres',host:'localhost',database:'postgres'}); 
pool.query("SELECT pg_get_viewdef('importador.fatos_dashboard')").then(res => { 
    console.log(res.rows[0].pg_get_viewdef); 
    pool.end(); 
}).catch(e=>{
    console.log(e);
    pool.end();
});
