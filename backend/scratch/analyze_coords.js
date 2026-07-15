const {Pool}=require('pg');
const pool=new Pool({user:'postgres',host:'localhost',database:'postgres',password:'postgres',port:5432});

async function analyze() {
  const {rows} = await pool.query(`SELECT latitude, longitude FROM importador.zeus_consolidado WHERE latitude IS NOT NULL LIMIT 20`);
  rows.forEach(r => {
    let lat = parseFloat(r.latitude.replace(',', '.'));
    let lon = parseFloat(r.longitude.replace(',', '.'));
    console.log(`Raw: lat=${r.latitude}, lon=${r.longitude} => Parsed: lat=${lat}, lon=${lon}`);
    // If abs(lat) > 90, we need to shift decimal
    while(Math.abs(lat) > 90) lat /= 10;
    while(Math.abs(lon) > 180) lon /= 10;
    console.log(`  Fixed: lat=${lat}, lon=${lon}`);
  });
  pool.end();
}
analyze().catch(console.error);
