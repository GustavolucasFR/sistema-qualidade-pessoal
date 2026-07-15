const pool = require('./src/config/db');

async function run() {
  const client = await pool.connect();
  try {
    console.log("Mapping columns...");
    const res_dest = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'importador' AND table_name = 'zeus_consolidado'
    `);
    const destCols = res_dest.rows.map(r => r.column_name);

    const res_src = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'importador' AND table_name = '06_base_zeus_jul_26'
    `);
    const srcCols = res_src.rows.map(r => r.column_name);

    let mapped = [];
    for (let sc of srcCols) {
      let normalized = sc.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      if (normalized === 'numero_da_ordem_de_servico') normalized = 'n_mero_da_ordem_de_servi_o';
      
      let match = destCols.find(dc => dc === normalized);
      if (!match) {
        const noAccent = sc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        match = destCols.find(dc => dc === noAccent);
      }
      if (!match) {
          const raw = sc.toLowerCase().trim();
          match = destCols.find(dc => dc.length === raw.length && dc.substring(0,3) === raw.substring(0,3));
      }

      if (match) {
        mapped.push({ src: sc, dest: match });
      }
    }

    // Deduplicate mappings just in case
    const uniqueMapped = [];
    const seenDest = new Set();
    for (const m of mapped) {
      if (!seenDest.has(m.dest)) {
        uniqueMapped.push(m);
        seenDest.add(m.dest);
      }
    }

    console.log(`Mapped ${uniqueMapped.length} unique columns.`);

    const srcColNames = uniqueMapped.map(m => `"${m.src}"`).join(', ');
    const destColNames = uniqueMapped.map(m => `"${m.dest}"`).join(', ');

    await client.query('BEGIN');

    console.log("Deleting old matching records...");
    await client.query(`
      DELETE FROM importador.zeus_consolidado
      WHERE n_mero_da_ordem_de_servi_o IN (
        SELECT "Número da Ordem de Serviço"
        FROM importador."06_base_zeus_jul_26"
        WHERE "Número da Ordem de Serviço" IS NOT NULL
      )
    `);

    console.log("Inserting new records...");
    await client.query(`
      INSERT INTO importador.zeus_consolidado (${destColNames})
      SELECT ${srcColNames}
      FROM importador."06_base_zeus_jul_26"
    `);

    console.log("Deduplicating zeus_consolidado...");
    await client.query(`
      DELETE FROM importador.zeus_consolidado a
      USING importador.zeus_consolidado b
      WHERE a.ctid < b.ctid
        AND a.n_mero_da_ordem_de_servi_o = b.n_mero_da_ordem_de_servi_o
        AND a.id_do_t_cnico = b.id_do_t_cnico
        AND a.status = b.status
        AND a.data_agendada_para_execu__o = b.data_agendada_para_execu__o
    `);

    console.log("Dropping unused tables...");
    const tablesToDrop = [
      '06_base_zeus_jul_26',
      '06_base_zeus_jun_26',
      'producaoba_01072026',
      'zeus',
      'producao_ba',
      'producao_ba_detalhado',
      'v_producao_ba'
    ];
    for (const tbl of tablesToDrop) {
      console.log(`Dropping ${tbl}...`);
      try {
        await client.query(`DROP TABLE IF EXISTS importador."${tbl}" CASCADE`);
      } catch (e) {
        if (e.code === '42809') {
          await client.query(`DROP VIEW IF EXISTS importador."${tbl}" CASCADE`);
        } else {
          throw e;
        }
      }
    }

    await client.query('COMMIT');
    console.log("Migration complete!");
  } catch(e) {
    await client.query('ROLLBACK');
    console.error("Migration failed!", e);
  } finally {
    client.release();
  }
  pool.end();
}
run();
