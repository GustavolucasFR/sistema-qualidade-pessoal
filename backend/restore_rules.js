const fs = require('fs');
const { Pool } = require('pg');
const csv = require('csv-parser');

const pool = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  database: 'postgres'
});

async function run() {
  await pool.query(`DROP TABLE IF EXISTS importador.regras_receita_extra CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS importador.regras_preventivas_extra CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS importador.regras_reparo_extra CASCADE`);
  await pool.query(`ALTER TABLE importador.regras_receita RENAME TO regras_receita_extra`);
  
  await pool.query(`
    CREATE TABLE importador.regras_receita (
      chave VARCHAR PRIMARY KEY,
      receita_vivo NUMERIC,
      receita_fibrasil NUMERIC
    );
  `);
  
  const resultsReceita = [];
  fs.createReadStream('C:\\\\Users\\\\TECNOMULTI\\\\.gemini\\\\antigravity-ide\\\\brain\\\\d3213d44-f6f3-4f97-aefc-71c3a1def88b\\\\scratch\\\\regras_receita.csv')
    .pipe(csv())
    .on('data', (data) => resultsReceita.push(data))
    .on('end', async () => {
      for (const row of resultsReceita) {
        if (!row.chave || row.chave.trim() === '') continue;
        
        await pool.query(
          'INSERT INTO importador.regras_receita (chave, receita_vivo, receita_fibrasil) VALUES ($1, $2, $3) ON CONFLICT (chave) DO NOTHING',
          [row.chave, parseFloat(row.receita_vivo) || 0, parseFloat(row.receita_fibrasil) || 0]
        );
      }
      console.log('Base rules restored!');
      pool.end();
    });
}
run();
