const pool = require('../config/db');

async function fetchAggregatedBacklog(tableName, localTodayStr, groupByMode, pool, dateFilter = null) {
  const megaClusterCol = groupByMode === 'cidade' ? 'b."CLUSTER_"' : "'GERAL'";
  const clusterCol = groupByMode === 'cidade' ? 'b."CITY"' : 'b."CLUSTER_"';

  let dateWhere = "";
  const params = [localTodayStr];
  
  if (dateFilter) {
    dateWhere = `AND b."DATA_CARGA" = $2`;
    params.push(dateFilter);
  }

  const query = `
    WITH backlog_aging AS (
      SELECT 
        ${megaClusterCol} as mega_cluster,
        ${clusterCol} as cluster,
        COALESCE(NULLIF(b."STATUS_REASON", ''), b."STATUS") as status_reason,
        EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 as horas_aberto,
        CASE 
          WHEN b."DATA_VENCIMENTO" IS NOT NULL AND TO_DATE(b."DATA_VENCIMENTO", 'DD/MM/YYYY') = TO_DATE(SUBSTRING($1 FROM 1 FOR 10), 'YYYY-MM-DD') THEN 'agenda_hoje'
          WHEN EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 24 THEN 'menor_24h'
          WHEN EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 24 AND EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 48 THEN 'entre_24_48h'
          WHEN EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 48 AND EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 72 THEN 'entre_48_72h'
          WHEN EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 72 AND EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 120 THEN 'maior_3_dias'
          WHEN EXTRACT(EPOCH FROM (TO_TIMESTAMP($1, 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 120 THEN 'maior_5_dias'
          ELSE 'Desconhecido'
        END AS faixa_aging
      FROM ${tableName} b
      WHERE b."STATUS" IN ('PENDENTE', 'AGENDADA', 'EXECUCAO')
        AND COALESCE(NULLIF(b."STATUS_REASON", ''), b."STATUS") != 'TRIAGEM'
        AND b."CLUSTER_" IS NOT NULL
        AND b."ARMARIO" IN (SELECT "ARMARIO" FROM importador.whitelist_armarios)
        AND b."PHYSICAL_LINK_MEDIA_TYPE"::text ILIKE 'GPON'
        ${dateWhere}
    ),
    categorias AS (
      SELECT 
        mega_cluster,
        cluster,
        status_reason,
        faixa_aging,
        horas_aberto
      FROM backlog_aging
    )
    SELECT 
      mega_cluster,
      cluster,
      status_reason,
      COUNT(CASE WHEN faixa_aging = 'agenda_hoje' THEN 1 END) AS agenda_hoje,
      COUNT(CASE WHEN faixa_aging = 'menor_24h' THEN 1 END) AS menor_24h,
      COUNT(CASE WHEN faixa_aging = 'entre_24_48h' THEN 1 END) AS entre_24_48h,
      COUNT(CASE WHEN faixa_aging = 'entre_48_72h' THEN 1 END) AS entre_48_72h,
      COUNT(CASE WHEN faixa_aging = 'maior_3_dias' THEN 1 END) AS maior_3_dias,
      COUNT(CASE WHEN faixa_aging = 'maior_5_dias' THEN 1 END) AS maior_5_dias,
      COUNT(*) AS total_abertas,
      AVG(CASE WHEN COALESCE(NULLIF(status_reason, ''), '') NOT ILIKE '%preventiva%' THEN horas_aberto END) as tmr_horas
    FROM categorias
    GROUP BY mega_cluster, cluster, status_reason
    ORDER BY mega_cluster ASC, cluster ASC, status_reason ASC;
  `;

  const { rows } = await pool.query(query, params);

  const tmrQuery = `
    SELECT 
      UPPER(TRIM(cidade)) as cluster,
      AVG(EXTRACT(EPOCH FROM (
        CASE 
          WHEN t_rmino_da_atividade LIKE '%-%' THEN t_rmino_da_atividade::timestamp
          ELSE (SUBSTRING(data_agendada_para_execu__o::text FROM 1 FOR 10) || ' ' || t_rmino_da_atividade)::timestamp
        END
      - data_de_cria__o_da_atividade::timestamp))/3600) as tmr_fechadas
    FROM importador.zeus_consolidado
    WHERE tipo_de_atividade ILIKE '%defeito%'
      AND (status ILIKE '%conclu%' OR status ILIKE '%cancel%')
      AND data_agendada_para_execu__o IS NOT NULL
      AND t_rmino_da_atividade IS NOT NULL
      AND data_de_cria__o_da_atividade IS NOT NULL
      AND TO_CHAR(data_agendada_para_execu__o::date, 'YYYY-MM-DD') = SUBSTRING($1 FROM 1 FOR 10)
    GROUP BY UPPER(TRIM(cidade))
  `;
  const tmrRes = await pool.query(tmrQuery, [localTodayStr]);
  const tmrMap = {};
  tmrRes.rows.forEach(r => { tmrMap[r.cluster] = parseFloat(r.tmr_fechadas); });

  let lastUpdate = null;
  try {
    let updateQuery = `SELECT MAX("DATA_CARGA") as last_update FROM ${tableName}`;
    if (dateFilter) {
        updateQuery += ` WHERE "DATA_CARGA" = $1`;
        const { rows: updateRows } = await pool.query(updateQuery, [dateFilter]);
        if (updateRows.length > 0) lastUpdate = updateRows[0].last_update;
    } else {
        const { rows: updateRows } = await pool.query(updateQuery);
        if (updateRows.length > 0) lastUpdate = updateRows[0].last_update;
    }
  } catch(e) {
    console.error(`Erro ao buscar data de carga de ${tableName}`, e);
  }

  const clusterMap = {};

  rows.forEach(row => {
    const clusterName = row.cluster;

    if (!clusterMap[clusterName]) {
      clusterMap[clusterName] = {
        mega_cluster: row.mega_cluster,
        cluster: clusterName,
        agenda_hoje: 0,
        menor_24h: 0,
        entre_24_48h: 0,
        entre_48_72h: 0,
        maior_3_dias: 0,
        maior_5_dias: 0,
        total_abertas: 0,
        tmr_horas_sum: 0,
        tmr_horas_count: 0,
        servicos: []
      };
    }

    clusterMap[clusterName].agenda_hoje += parseInt(row.agenda_hoje, 10);
    clusterMap[clusterName].menor_24h += parseInt(row.menor_24h, 10);
    clusterMap[clusterName].entre_24_48h += parseInt(row.entre_24_48h, 10);
    clusterMap[clusterName].entre_48_72h += parseInt(row.entre_48_72h, 10);
    clusterMap[clusterName].maior_3_dias += parseInt(row.maior_3_dias, 10);
    clusterMap[clusterName].maior_5_dias += parseInt(row.maior_5_dias, 10);
    
    const count = parseInt(row.total_abertas, 10);
    clusterMap[clusterName].total_abertas += count;

    const isPreventiva = (row.status_reason || '').toLowerCase().includes('preventiva');
    const tmr_h = parseFloat(row.tmr_horas) || 0;

    if (!isPreventiva && tmr_h > 0) {
        clusterMap[clusterName].tmr_horas_sum += (tmr_h * count);
        clusterMap[clusterName].tmr_horas_count += count;
    }

    clusterMap[clusterName].servicos.push({
      status_reason: row.status_reason,
      agenda_hoje: parseInt(row.agenda_hoje, 10),
      menor_24h: parseInt(row.menor_24h, 10),
      entre_24_48h: parseInt(row.entre_24_48h, 10),
      entre_48_72h: parseInt(row.entre_48_72h, 10),
      maior_3_dias: parseInt(row.maior_3_dias, 10),
      maior_5_dias: parseInt(row.maior_5_dias, 10),
      total_abertas: count,
      tmr_horas: tmr_h
    });
  });

  const resultData = Object.values(clusterMap).map(c => {
      c.tmr_horas = c.tmr_horas_count > 0 ? (c.tmr_horas_sum / c.tmr_horas_count) : 0;
      const upperCluster = (c.cluster || '').toUpperCase().trim();
      c.tmr_fechadas = tmrMap[upperCluster] || tmrMap[c.cluster] || 0;
      return c;
  });

  return { lastUpdate, data: resultData };
}

const getBacklogDatas = async (req, res) => {
  try {
    const checkTableQuery = `SELECT to_regclass('importador.backlogdiario_historico') as table_exists;`;
    const { rows: tableRows } = await pool.query(checkTableQuery);
    
    if (tableRows[0].table_exists) {
        const query = `
          SELECT SUBSTRING("DATA_CARGA", 1, 10) as dia_historico 
          FROM importador.backlogdiario_historico 
          WHERE "DATA_CARGA" IS NOT NULL 
          GROUP BY SUBSTRING("DATA_CARGA", 1, 10) 
          ORDER BY TO_DATE(SUBSTRING("DATA_CARGA", 1, 10), 'DD/MM/YYYY') DESC
        `;
        const { rows } = await pool.query(query);
        res.json(rows.map(r => r.dia_historico));
    } else {
        res.json([]);
    }
  } catch (err) {
    console.error('Erro ao buscar datas do backlog historico:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

const getBacklogDashboard = async (req, res) => {
  try {
    const groupByMode = req.query.groupBy || 'cidade';
    const historyDate = req.query.date || null;
    
    const today = new Date();
    const localTodayStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0') + ' ' +
      String(today.getHours()).padStart(2, '0') + ':' +
      String(today.getMinutes()).padStart(2, '0') + ':' +
      String(today.getSeconds()).padStart(2, '0');

    let atual;
    
    if (historyDate && historyDate !== 'atual') {
      // Busca todos os cortes (horarios) registrados para aquele dia
      const { rows: dateRows } = await pool.query(
        `SELECT "DATA_CARGA" FROM importador.backlogdiario_historico WHERE "DATA_CARGA" LIKE $1 GROUP BY "DATA_CARGA" ORDER BY TO_TIMESTAMP("DATA_CARGA", 'DD/MM/YYYY HH24:MI') ASC`, 
        [`${historyDate}%`]
      );
      
      const snapshots = [];
      for (const dr of dateRows) {
        const snap = await fetchAggregatedBacklog('importador.backlogdiario_historico', localTodayStr, groupByMode, pool, dr.DATA_CARGA);
        snapshots.push({
          lastUpdate: snap.lastUpdate,
          data: snap.data
        });
      }
      return res.json(snapshots);
    }

    // Fluxo normal (Atual vs Recente do Historico)
    atual = await fetchAggregatedBacklog('importador.backlogdiario', localTodayStr, groupByMode, pool);
    
    let comparison = { novos: 0, finalizados: 0 };
    
    let d1_data = null;
    let d1_lastUpdate = null;
    
    try {
      const checkTableQuery = `SELECT to_regclass('importador.backlogdiario_historico') as table_exists;`;
      const { rows: tableRows } = await pool.query(checkTableQuery);
      
      if (tableRows[0].table_exists) {
        const todayDateStr = String(today.getDate()).padStart(2, '0') + '/' +
                             String(today.getMonth() + 1).padStart(2, '0') + '/' +
                             today.getFullYear();

        // Get the latest date from history that is NOT today
        const { rows: maxDateRows } = await pool.query(`
            SELECT "DATA_CARGA" as last_date 
            FROM importador.backlogdiario_historico 
            WHERE "DATA_CARGA" NOT LIKE $1
            ORDER BY TO_TIMESTAMP("DATA_CARGA", 'DD/MM/YYYY HH24:MI') DESC 
            LIMIT 1
        `, [todayDateStr + '%']);
        
        if (maxDateRows.length > 0 && maxDateRows[0].last_date) {
            const lastHistoryDate = maxDateRows[0].last_date;
            const compQuery = `
              SELECT 
                (SELECT COUNT(DISTINCT b1."COD_SS") FROM importador.backlogdiario b1 
                 LEFT JOIN importador.backlogdiario_historico b2 ON b1."COD_SS" = b2."COD_SS" AND b2."DATA_CARGA" = $1
                 WHERE b2."COD_SS" IS NULL AND b1."STATUS" IN ('PENDENTE', 'AGENDADA', 'EXECUCAO')) as novos,
                (SELECT COUNT(DISTINCT b2."COD_SS") FROM importador.backlogdiario_historico b2 
                 LEFT JOIN importador.backlogdiario b1 ON b2."COD_SS" = b1."COD_SS" 
                 WHERE b2."DATA_CARGA" = $1 AND b1."COD_SS" IS NULL AND b2."STATUS" IN ('PENDENTE', 'AGENDADA', 'EXECUCAO')) as finalizados
            `;
            const { rows: compRows } = await pool.query(compQuery, [lastHistoryDate]);
            if (compRows.length > 0) {
              comparison.novos = parseInt(compRows[0].novos, 10);
              comparison.finalizados = parseInt(compRows[0].finalizados, 10);
            }
            
            // Fetch aggregated data for D-1
            const snapD1 = await fetchAggregatedBacklog('importador.backlogdiario_historico', localTodayStr, groupByMode, pool, lastHistoryDate);
            d1_data = snapD1.data;
            d1_lastUpdate = snapD1.lastUpdate;
        }
      }
    } catch(e) {
      console.error('Erro ao buscar dados comparativos historicos', e);
    }

    res.json({
      lastUpdate: atual.lastUpdate,
      data: atual.data,
      comparison: comparison,
      d1_data: d1_data,
      d1_lastUpdate: d1_lastUpdate
    });
  } catch (err) {
    console.error('Erro ao processar dashboard de backlog:', err);
    res.status(500).json({ error: 'Erro interno no servidor ao processar o backlog.' });
  }
};



const getBacklogDetails = async (req, res) => {
  try {
    const { cluster, mega_cluster, status_reason, faixa_aging, snapshot, viewMode } = req.query;
    
    let tableName = 'importador.backlogdiario';
    let dateWhere = '';
    let params = [];
    
    // Configurar a data base para calculo de aging igual ao Dashboard
    const today = new Date();
    const localTodayStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0') + ' ' +
      String(today.getHours()).padStart(2, '0') + ':' +
      String(today.getMinutes()).padStart(2, '0') + ':' +
      String(today.getSeconds()).padStart(2, '0');

    const localTodayDateOnly = localTodayStr.substring(0, 10);

    if (snapshot === 'atual' || !snapshot) {
        // atual
    } else {
        // historico
        tableName = 'importador.backlogdiario_historico';
        dateWhere = ' AND b."DATA_CARGA" = $1 ';
        params.push(snapshot);
    }

    let filterConditions = '';
    
    if (viewMode === 'cidade') {
        if (mega_cluster && mega_cluster !== 'ALL') {
            params.push(mega_cluster);
            filterConditions += ` AND b."CLUSTER_" = $${params.length}`;
        }
        if (cluster) {
            params.push(cluster);
            filterConditions += ` AND b."CITY" = $${params.length}`;
        }
    } else {
        if (cluster) {
            params.push(cluster);
            filterConditions += ` AND b."CLUSTER_" = $${params.length}`;
        }
    }

    if (status_reason && status_reason !== 'ALL') {
        params.push(status_reason);
        filterConditions += ` AND COALESCE(NULLIF(b."STATUS_REASON", ''), b."STATUS") = $${params.length}`;
    }

    // Não considerar preventiva na tabela de detalhes
    filterConditions += ` AND COALESCE(NULLIF(b."STATUS_REASON", ''), b."STATUS") NOT ILIKE '%preventiva%'`;

    let agingCondition = '';
    if (faixa_aging) {
        if (faixa_aging === 'agenda_hoje') {
            agingCondition = ` AND b."DATA_VENCIMENTO" IS NOT NULL AND TO_DATE(b."DATA_VENCIMENTO", 'DD/MM/YYYY') = TO_DATE('${localTodayDateOnly}', 'YYYY-MM-DD') `;
        } else if (faixa_aging === 'menor_24h') {
            agingCondition = ` AND EXTRACT(EPOCH FROM (TO_TIMESTAMP('${localTodayStr}', 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 24 AND (b."DATA_VENCIMENTO" IS NULL OR TO_DATE(b."DATA_VENCIMENTO", 'DD/MM/YYYY') != TO_DATE('${localTodayDateOnly}', 'YYYY-MM-DD')) `;
        } else if (faixa_aging === 'entre_24_48h') {
            agingCondition = ` AND EXTRACT(EPOCH FROM (TO_TIMESTAMP('${localTodayStr}', 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 24 AND EXTRACT(EPOCH FROM (TO_TIMESTAMP('${localTodayStr}', 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 48 AND (b."DATA_VENCIMENTO" IS NULL OR TO_DATE(b."DATA_VENCIMENTO", 'DD/MM/YYYY') != TO_DATE('${localTodayDateOnly}', 'YYYY-MM-DD')) `;
        } else if (faixa_aging === 'entre_48_72h') {
            agingCondition = ` AND EXTRACT(EPOCH FROM (TO_TIMESTAMP('${localTodayStr}', 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 48 AND EXTRACT(EPOCH FROM (TO_TIMESTAMP('${localTodayStr}', 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 72 AND (b."DATA_VENCIMENTO" IS NULL OR TO_DATE(b."DATA_VENCIMENTO", 'DD/MM/YYYY') != TO_DATE('${localTodayDateOnly}', 'YYYY-MM-DD')) `;
        } else if (faixa_aging === 'maior_3_dias') {
            agingCondition = ` AND EXTRACT(EPOCH FROM (TO_TIMESTAMP('${localTodayStr}', 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 72 AND EXTRACT(EPOCH FROM (TO_TIMESTAMP('${localTodayStr}', 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 < 120 AND (b."DATA_VENCIMENTO" IS NULL OR TO_DATE(b."DATA_VENCIMENTO", 'DD/MM/YYYY') != TO_DATE('${localTodayDateOnly}', 'YYYY-MM-DD')) `;
        } else if (faixa_aging === 'maior_5_dias') {
            agingCondition = ` AND EXTRACT(EPOCH FROM (TO_TIMESTAMP('${localTodayStr}', 'YYYY-MM-DD HH24:MI:SS') - TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS'))) / 3600 >= 120 AND (b."DATA_VENCIMENTO" IS NULL OR TO_DATE(b."DATA_VENCIMENTO", 'DD/MM/YYYY') != TO_DATE('${localTodayDateOnly}', 'YYYY-MM-DD')) `;
        }
    }

    const query = `
      SELECT 
        b."COD_SS",
        b."ARMARIO",
        b."STATUS",
        b."STATUS_REASON",
        b."DATA_ABERTURA",
        b."CITY",
        b."CLUSTER_",
        b."DATA_VENCIMENTO"
      FROM ${tableName} b
      WHERE b."STATUS" IN ('PENDENTE', 'AGENDADA', 'EXECUCAO')
        AND COALESCE(NULLIF(b."STATUS_REASON", ''), b."STATUS") != 'TRIAGEM'
        AND b."ARMARIO" IN (SELECT "ARMARIO" FROM importador.whitelist_armarios)
        AND b."PHYSICAL_LINK_MEDIA_TYPE"::text ILIKE 'GPON'
        ${dateWhere}
        ${filterConditions}
        ${agingCondition}
      ORDER BY TO_TIMESTAMP(b."DATA_ABERTURA", 'DD/MM/YYYY HH24:MI:SS') ASC
    `;

    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error('Erro ao buscar detalhes do backlog:', err);
    require('fs').appendFileSync('C:/Users/TECNOMULTI/sistema-qualidade/err.log', err.toString() + '\\n' + err.stack + '\\n');
    res.status(500).json({ error: 'Erro interno ao buscar detalhes' });
  }
};

module.exports = {
  getBacklogDashboard,
  getBacklogDatas,
  getBacklogDetails
};
