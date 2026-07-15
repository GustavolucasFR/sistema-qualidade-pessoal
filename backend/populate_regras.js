const fs = require('fs');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
});

async function run() {
  const csv = require('csv-parser');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS importador.regras_receita (
      chave VARCHAR PRIMARY KEY,
      receita_vivo NUMERIC,
      receita_fibrasil NUMERIC
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS importador.regras_preventiva (
      chave_prev VARCHAR PRIMARY KEY,
      preventiva_rs NUMERIC
    );
  `);

  await pool.query('TRUNCATE TABLE importador.regras_receita, importador.regras_preventiva');

  // Load receita
  const resultsReceita = [];
  fs.createReadStream('C:\\Users\\TECNOMULTI\\.gemini\\antigravity-ide\\brain\\d3213d44-f6f3-4f97-aefc-71c3a1def88b\\scratch\\regras_receita.csv')
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
      console.log('Regras Receita inserted');
      
      const resultsPrev = [];
      fs.createReadStream('C:\\Users\\TECNOMULTI\\.gemini\\antigravity-ide\\brain\\d3213d44-f6f3-4f97-aefc-71c3a1def88b\\scratch\\regras_preventiva.csv')
        .pipe(csv())
        .on('data', (data) => resultsPrev.push(data))
        .on('end', async () => {
          for (const row of resultsPrev) {
            if (!row.chave_prev || row.chave_prev.trim() === '') continue;
            await pool.query(
              'INSERT INTO importador.regras_preventiva (chave_prev, preventiva_rs) VALUES ($1, $2) ON CONFLICT (chave_prev) DO NOTHING',
              [row.chave_prev, parseFloat(row.preventiva_rs) || 0]
            );
          }
          console.log('Regras Preventiva inserted');
          pool.end();
        });
    });
}
run();
