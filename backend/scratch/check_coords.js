const {Pool}=require('pg');
const pool=new Pool({user:'postgres',host:'localhost',database:'postgres',password:'postgres',port:5432});
pool.query(`SELECT id_de_arm_rio, latitude, longitude FROM importador.zeus_consolidado WHERE latitude IS NOT NULL LIMIT 5`).then(res => {
  console.log(res.rows);
  pool.end();
}).catch(console.error);
