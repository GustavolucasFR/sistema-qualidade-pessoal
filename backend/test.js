const pool = require('./src/config/db');

async function test() {
  const os = '7637709922:66606618';
  const query = `
    SELECT 
      TRIM(tipo_de_atividade) as tipo, 
      TRIM(estado) as estado, 
      TRIM(tecnologia) as tec, 
      cidade, 
      projeto_matrix__fibra_dedicada_ as drop
    FROM importador.zeus_consolidado 
    WHERE n_mero_da_ordem_de_servi_o = $1
  `;
  const res = await pool.query(query, [os]);
  console.log("Zeus Data:", res.rows[0]);
  
  // also check if the rule exists in regras_receita for this OS
  const ruleQuery = `
    SELECT * FROM importador.regras_receita
    WHERE UPPER(chave) LIKE UPPER($1)
  `;
  const ruleRes = await pool.query(ruleQuery, [`%${res.rows[0].tipo}%`]);
  console.log("Rule count for this tipo_de_atividade:", ruleRes.rowCount);
  if(ruleRes.rowCount > 0) {
    console.log("Found rules:", ruleRes.rows);
  }
}

test().catch(console.error).finally(()=>pool.end());
