const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

exports.getProducaoBa = async (req, res) => {
  try {
    const targetMonth = req.query.mes ? parseInt(req.query.mes, 10) : null;
    let maxDQuery = `SELECT MAX(data_execucao) as d_max FROM importador.fatos_dashboard`;
    if (targetMonth) {
        maxDQuery = `SELECT make_date(2026, ${targetMonth}, 20)::date as d_max`;
    }

    // Carregar Metas dinamicas do banco
    const metasQuery = `SELECT cidade, mes_num, meta_orcada FROM importador.metas_dre`;
    const metasRes = await pool.query(metasQuery);
    const metas_dre = {};
    metasRes.rows.forEach(row => {
        const cid = (row.cidade || '').toUpperCase().trim();
        if (!metas_dre[cid]) metas_dre[cid] = {};
        metas_dre[cid][row.mes_num] = parseFloat(row.meta_orcada);
    });
    if (metas_dre["JOAO PESSOA"]) metas_dre["JOÃO PESSOA"] = metas_dre["JOAO PESSOA"];
    if (metas_dre["GARANHUNS"]) metas_dre["GARANHUS"] = metas_dre["GARANHUNS"];

    const query = `
      WITH max_d AS (
          ${maxDQuery}
      ),
      cycle_dates AS (
          SELECT 
              d_max,
              CASE WHEN EXTRACT(DAY FROM d_max) >= 21 THEN
                  make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 21)
              ELSE
                  make_date(EXTRACT(YEAR FROM (d_max - interval '1 month'))::int, EXTRACT(MONTH FROM (d_max - interval '1 month'))::int, 21)
              END as ciclo_inicio,
              CASE WHEN EXTRACT(DAY FROM d_max) >= 21 THEN
                  make_date(EXTRACT(YEAR FROM (d_max + interval '1 month'))::int, EXTRACT(MONTH FROM (d_max + interval '1 month'))::int, 20)
              ELSE
                  make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 20)
              END as ciclo_fim
          FROM max_d
      ),
      working_days AS (
          SELECT c.cluster_oficial, gs.d::date as d
          FROM (SELECT DISTINCT cluster_oficial FROM importador.fatos_dashboard WHERE cluster_oficial IS NOT NULL) c
          CROSS JOIN cycle_dates
          CROSS JOIN generate_series(ciclo_inicio, ciclo_fim, interval '1 day') gs(d)
          WHERE EXTRACT(ISODOW FROM gs.d) != 7
            AND NOT EXISTS (
                SELECT 1 FROM importador.feriados_cidade f
                WHERE (UPPER(TRIM(f.cidade)) = UPPER(TRIM(c.cluster_oficial)) OR UPPER(TRIM(f.cidade)) = (CASE WHEN UPPER(TRIM(c.cluster_oficial)) = 'JOÃO PESSOA' THEN 'JOAO PESSOA' ELSE UPPER(TRIM(c.cluster_oficial)) END)) 
                  AND f.data_feriado = gs.d::date
            )
      ),
      remaining_working_days AS (
          SELECT 
              cluster_oficial,
              COUNT(CASE WHEN d > (SELECT d_max FROM cycle_dates) THEN 1 END) as r_days,
              COUNT(d) as total_days
          FROM working_days
          GROUP BY cluster_oficial
      ),
      last_6_wd AS (
          SELECT cluster_oficial, d
          FROM (
              SELECT cluster_oficial, d, ROW_NUMBER() OVER (PARTITION BY cluster_oficial ORDER BY d DESC) as rn
              FROM working_days
              WHERE d <= LEAST((SELECT d_max FROM cycle_dates), (SELECT MAX(data_execucao) FROM importador.fatos_dashboard))
          ) t WHERE rn <= 6
      )
      SELECT 
          pd.cidade_raw,
          pd.cluster_oficial as cluster,
          TO_CHAR(MAX(cycle_dates.ciclo_inicio), 'YYYY-MM-DD') as ciclo_inicio,
          TO_CHAR(MAX(cycle_dates.ciclo_fim), 'YYYY-MM-DD') as ciclo_fim,
          MAX(pd.mes_ciclo) as mes_ciclo,
          COUNT(DISTINCT pd.mat_vivo) as hc_produtivos,
          SUM(pd.is_produtivo) as producao_vol,
          SUM(pd.producao_rs) as producao_rs,
          SUM(pd.receita_vivo) as receita_vivo,
          SUM(pd.receita_fibrasil) as receita_fibrasil,
          SUM(pd.is_instalacao) as instalacao,
          SUM(pd.is_mudanca) as mudanca,
          COALESCE(MAX(rwd.r_days), 0) as dias_restantes,
          COALESCE(MAX(rwd.total_days), 0) as dias_uteis_total,
          (SUM(CASE WHEN l6.d IS NOT NULL THEN pd.is_produtivo ELSE 0 END) / 6.0) as media_6d_vol,
          (SUM(CASE WHEN l6.d IS NOT NULL THEN pd.producao_rs ELSE 0 END) / 6.0) as media_6d_rs
      FROM importador.fatos_dashboard pd
      CROSS JOIN cycle_dates
      LEFT JOIN remaining_working_days rwd ON rwd.cluster_oficial = pd.cluster_oficial
      LEFT JOIN last_6_wd l6 ON l6.cluster_oficial = pd.cluster_oficial AND l6.d = pd.data_execucao
      WHERE pd.cluster_oficial IS NOT NULL AND pd.is_cancelada = 0
        AND pd.data_execucao >= cycle_dates.ciclo_inicio 
        AND pd.data_execucao <= cycle_dates.ciclo_fim
      GROUP BY pd.cidade_raw, pd.cluster_oficial
      ORDER BY producao_rs DESC;
    `;
    const { rows } = await pool.query(query);

    const queryEvolutivo = `
      WITH max_d AS (
          ${maxDQuery}
      ),
      cycle_dates AS (
          SELECT 
              d_max,
              CASE WHEN EXTRACT(DAY FROM d_max) >= 21 THEN
                  make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 21)
              ELSE
                  make_date(EXTRACT(YEAR FROM (d_max - interval '1 month'))::int, EXTRACT(MONTH FROM (d_max - interval '1 month'))::int, 21)
              END as ciclo_inicio,
              CASE WHEN EXTRACT(DAY FROM d_max) >= 21 THEN
                  make_date(EXTRACT(YEAR FROM (d_max + interval '1 month'))::int, EXTRACT(MONTH FROM (d_max + interval '1 month'))::int, 20)
              ELSE
                  make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 20)
              END as ciclo_fim
          FROM max_d
      )
      SELECT 
          pd.data_execucao,
          SUM(pd.producao_rs) as producao_diaria
      FROM importador.fatos_dashboard pd
      CROSS JOIN cycle_dates
      WHERE pd.is_cancelada = 0
        AND pd.data_execucao >= cycle_dates.ciclo_inicio 
        AND pd.data_execucao <= cycle_dates.ciclo_fim
      GROUP BY pd.data_execucao
      ORDER BY data_execucao;
    `;
    const resEvolutivo = await pool.query(queryEvolutivo);
    const evolutivoRows = resEvolutivo.rows;
    
    const queryCiclos = `
      SELECT DISTINCT mes_ciclo as mes
      FROM importador.fatos_dashboard
      ORDER BY mes DESC;
    `;
    const resCiclos = await pool.query(queryCiclos);
    const ciclos_disponiveis = resCiclos.rows.map(r => parseInt(r.mes, 10));

    const queryHcGlobal = `
      WITH max_d AS (
          ${maxDQuery}
      ),
      cycle_dates AS (
          SELECT 
              d_max,
              CASE WHEN EXTRACT(DAY FROM d_max) >= 21 THEN
                  make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 21)
              ELSE
                  make_date(EXTRACT(YEAR FROM (d_max - interval '1 month'))::int, EXTRACT(MONTH FROM (d_max - interval '1 month'))::int, 21)
              END as ciclo_inicio,
              CASE WHEN EXTRACT(DAY FROM d_max) >= 21 THEN
                  make_date(EXTRACT(YEAR FROM (d_max + interval '1 month'))::int, EXTRACT(MONTH FROM (d_max + interval '1 month'))::int, 20)
              ELSE
                  make_date(EXTRACT(YEAR FROM d_max)::int, EXTRACT(MONTH FROM d_max)::int, 20)
              END as ciclo_fim
          FROM max_d
      )
      SELECT COUNT(DISTINCT pd.mat_vivo) as total_hc
      FROM importador.fatos_dashboard pd
      CROSS JOIN cycle_dates
      WHERE pd.cluster_oficial IS NOT NULL AND pd.is_cancelada = 0
        AND pd.data_execucao >= cycle_dates.ciclo_inicio 
        AND pd.data_execucao <= cycle_dates.ciclo_fim
    `;
    const resHcGlobal = await pool.query(queryHcGlobal);
    const trueGlobalHc = parseFloat(resHcGlobal.rows[0]?.total_hc) || 0;

    const allowedClusters = ['NATAL', 'RECIFE', 'CARUARU', 'JOAO PESSOA'];

    const groupedDataCluster = {};
    const groupedDataCidade = {};
    
    if (rows.length > 0 || Object.keys(metas_dre).length > 0) {
        const mesNum = (rows.length > 0) ? parseInt(rows[0].mes_ciclo, 10) : (req.query.mes ? parseInt(req.query.mes, 10) : new Date().getMonth() + 1);
        
        metasRes.rows.forEach(row_meta => {
            if (row_meta.mes_num === mesNum) {
                const cidadeDRE = (row_meta.cidade || '').toUpperCase().trim();
                if (cidadeDRE === 'B2B') return;
                
                let clusterMapped = cidadeDRE;
                if (cidadeDRE === 'GARANHUNS') clusterMapped = 'CARUARU';
                if (cidadeDRE === 'JABOATAO DOS GUARARAPES') clusterMapped = 'RECIFE';
                if (cidadeDRE === 'CABEDELO' || cidadeDRE === 'PATOS' || cidadeDRE === 'CAMPINA GRANDE') clusterMapped = 'JOAO PESSOA';
                if (cidadeDRE === 'MOSSORO' || cidadeDRE === 'PARNAMIRIM') clusterMapped = 'NATAL';
                if (clusterMapped === 'JOÃO PESSOA') clusterMapped = 'JOAO PESSOA';

                if (!allowedClusters.includes(clusterMapped)) return;

                if (!groupedDataCluster[clusterMapped]) {
                    groupedDataCluster[clusterMapped] = {
                        cluster: clusterMapped, hc_produtivos: 0, faturamento_hc: 0,
                        producao_vol: 0, producao_rs: 0, meta_orcada: 0, gap_producao_meta: 0,
                        receita_vivo: 0, receita_fibrasil: 0, instalacao: 0, mudanca: 0,
                        projecao_producao: 0
                    };
                }

                if (!groupedDataCidade[cidadeDRE]) {
                    groupedDataCidade[cidadeDRE] = {
                        cluster: cidadeDRE, hc_produtivos: 0, faturamento_hc: 0,
                        producao_vol: 0, producao_rs: 0, meta_orcada: 0, gap_producao_meta: 0,
                        receita_vivo: 0, receita_fibrasil: 0, instalacao: 0, mudanca: 0,
                        projecao_producao: 0, parent_cluster: clusterMapped
                    };
                }
            }
        });
    }

    rows.forEach(row => {
      const cidadeUpper = (row.cidade_raw || '').toUpperCase().trim();
      const clusterName = row.cluster;
      
      if (!allowedClusters.includes(clusterName)) return;

      const mesNum = parseInt(row.mes_ciclo, 10);
      let hasMeta = (metas_dre[cidadeUpper] && metas_dre[cidadeUpper][mesNum] > 0);
      const targetCidade = hasMeta ? cidadeUpper : clusterName;

      if (!groupedDataCluster[clusterName]) {
        groupedDataCluster[clusterName] = {
          cluster: clusterName, hc_produtivos: 0, faturamento_hc: 0,
          producao_vol: 0, producao_rs: 0, meta_orcada: 0, gap_producao_meta: 0,
          receita_vivo: 0, receita_fibrasil: 0, instalacao: 0, mudanca: 0,
          projecao_producao: 0
        };
      }
      
      if (!groupedDataCidade[targetCidade]) {
        groupedDataCidade[targetCidade] = {
          cluster: targetCidade, hc_produtivos: 0, faturamento_hc: 0,
          producao_vol: 0, producao_rs: 0, meta_orcada: 0, gap_producao_meta: 0,
          receita_vivo: 0, receita_fibrasil: 0, instalacao: 0, mudanca: 0,
          projecao_producao: 0, parent_cluster: clusterName
        };
      }

      const gC = groupedDataCluster[clusterName];
      gC.hc_produtivos += parseFloat(row.hc_produtivos) || 0;
      gC.producao_vol += parseFloat(row.producao_vol) || 0;
      gC.producao_rs += parseFloat(row.producao_rs) || 0;
      gC.receita_vivo += parseFloat(row.receita_vivo) || 0;
      gC.receita_fibrasil += parseFloat(row.receita_fibrasil) || 0;
      gC.instalacao += parseFloat(row.instalacao) || 0;
      gC.mudanca += parseFloat(row.mudanca) || 0;
      gC.meta_orcada = 0;
      gC.dias_uteis_total = Math.max(gC.dias_uteis_total || 0, parseFloat(row.dias_uteis_total) || 0);

      const media_6d_rs = parseFloat(row.media_6d_rs) || 0;
      const dias_restantes = parseFloat(row.dias_restantes) || 0;
      gC.projecao_producao += parseFloat(row.producao_rs) + (media_6d_rs * dias_restantes);

      const gCd = groupedDataCidade[targetCidade];
      gCd.hc_produtivos += parseFloat(row.hc_produtivos) || 0;
      gCd.producao_vol += parseFloat(row.producao_vol) || 0;
      gCd.producao_rs += parseFloat(row.producao_rs) || 0;
      gCd.receita_vivo += parseFloat(row.receita_vivo) || 0;
      gCd.receita_fibrasil += parseFloat(row.receita_fibrasil) || 0;
      gCd.instalacao += parseFloat(row.instalacao) || 0;
      gCd.mudanca += parseFloat(row.mudanca) || 0;
      gCd.dias_uteis_total = Math.max(gCd.dias_uteis_total || 0, parseFloat(row.dias_uteis_total) || 0);
      gCd.projecao_producao += parseFloat(row.producao_rs) + (media_6d_rs * dias_restantes);

      let meta_cidade = 0;
      if (metas_dre[cidadeUpper] && metas_dre[cidadeUpper][mesNum]) {
          meta_cidade = metas_dre[cidadeUpper][mesNum];
      }
      gCd.meta_orcada += meta_cidade;
    });
    
    if (rows.length > 0) {
        const mesNum = parseInt(rows[0].mes_ciclo, 10);
        Object.values(groupedDataCluster).forEach(g => { g.meta_orcada = 0; });
        Object.values(groupedDataCidade).forEach(g => { g.meta_orcada = 0; });

        metasRes.rows.forEach(row_meta => {
            if (row_meta.mes_num === mesNum) {
                const cidadeDRE = (row_meta.cidade || '').toUpperCase().trim();
                if (cidadeDRE === 'B2B') return; 

                const metaValue = parseFloat(row_meta.meta_orcada) || 0;
                let clusterMapped = cidadeDRE;
                if (cidadeDRE === 'GARANHUNS') clusterMapped = 'CARUARU';
                if (cidadeDRE === 'JABOATAO DOS GUARARAPES') clusterMapped = 'RECIFE';
                if (cidadeDRE === 'CABEDELO' || cidadeDRE === 'PATOS' || cidadeDRE === 'CAMPINA GRANDE') clusterMapped = 'JOAO PESSOA';
                if (cidadeDRE === 'MOSSORO' || cidadeDRE === 'PARNAMIRIM') clusterMapped = 'NATAL';
                if (clusterMapped === 'JOÃO PESSOA') clusterMapped = 'JOAO PESSOA';

                if (!allowedClusters.includes(clusterMapped)) return;

                if (groupedDataCluster[clusterMapped]) groupedDataCluster[clusterMapped].meta_orcada += metaValue;
                if (groupedDataCidade[cidadeDRE]) groupedDataCidade[cidadeDRE].meta_orcada += metaValue;
            }
        });
    }

    Object.values(groupedDataCluster).forEach(g => { g.gap_producao_meta = g.producao_rs - g.meta_orcada; });
    Object.values(groupedDataCidade).forEach(g => { g.gap_producao_meta = g.producao_rs - g.meta_orcada; });

    let dias_restantes_global = 0;
    let dias_uteis_total_global = 0;
    if (rows.length > 0) {
        dias_restantes_global = parseFloat(rows[0].dias_restantes) || 0;
        dias_uteis_total_global = parseFloat(rows[0].dias_uteis_total) || 0;
    }

    const mapRow = row => {
      row.faturamento_hc = row.hc_produtivos > 0 ? row.producao_rs / row.hc_produtivos : 0;
      row.ticket_medio = row.producao_vol > 0 ? row.producao_rs / row.producao_vol : 0;
      let falta_rs = row.meta_orcada - row.producao_rs;
      if (falta_rs < 0) falta_rs = 0;
      row.meta_diaria_rs = (row.dias_uteis_total > 0) ? row.meta_orcada / row.dias_uteis_total : 0;
      row.meta_diaria_atividades = row.ticket_medio > 0 ? row.meta_diaria_rs / row.ticket_medio : 0;
      return row;
    };

    const finalRowsCluster = Object.values(groupedDataCluster).map(mapRow).filter(row => row.meta_orcada > 0 || row.producao_rs > 0);
    finalRowsCluster.sort((a, b) => b.producao_rs - a.producao_rs);

    const finalRowsCidade = Object.values(groupedDataCidade).map(mapRow).filter(row => row.meta_orcada > 0 || row.producao_rs > 0);
    finalRowsCidade.sort((a, b) => b.producao_rs - a.producao_rs);

    const totais = finalRowsCluster.reduce((acc, row) => {
      acc.hc_produtivos += row.hc_produtivos;
      acc.producao_vol += row.producao_vol;
      acc.producao_rs += row.producao_rs;
      acc.meta_orcada += row.meta_orcada;
      acc.gap_producao_meta += row.gap_producao_meta;
      acc.receita_vivo += row.receita_vivo;
      acc.receita_fibrasil += row.receita_fibrasil;
      acc.instalacao += row.instalacao;
      acc.mudanca += row.mudanca;
      acc.projecao_producao += row.projecao_producao;
      return acc;
    }, { hc_produtivos: 0, producao_vol: 0, producao_rs: 0, meta_orcada: 0, gap_producao_meta: 0, receita_vivo: 0, receita_fibrasil: 0, instalacao: 0, mudanca: 0, projecao_producao: 0 });

    totais.hc_produtivos = trueGlobalHc;
    totais.faturamento_hc = totais.hc_produtivos > 0 ? totais.producao_rs / totais.hc_produtivos : 0;
    totais.ticket_medio = totais.producao_vol > 0 ? totais.producao_rs / totais.producao_vol : 0;
    let total_falta_rs = totais.meta_orcada - totais.producao_rs;
    if (total_falta_rs < 0) total_falta_rs = 0;
    totais.meta_diaria_rs = (dias_uteis_total_global > 0) ? totais.meta_orcada / dias_uteis_total_global : 0;
    totais.meta_diaria_atividades = totais.ticket_medio > 0 ? totais.meta_diaria_rs / totais.ticket_medio : 0;

    let cicloData = null;
    if (rows.length > 0) {
      const ciclo_inicio = rows[0].ciclo_inicio;
      const ciclo_fim = rows[0].ciclo_fim;
      cicloData = {
        inicio: ciclo_inicio ? new Date(ciclo_inicio).toLocaleDateString('pt-BR') : null,
        fim: ciclo_fim ? new Date(ciclo_fim).toLocaleDateString('pt-BR') : null,
        ciclo_inicio_raw: ciclo_inicio,
        ciclo_fim_raw: ciclo_fim
      };
    }

    res.json({
      success: true,
      data_cluster: finalRowsCluster,
      data_cidade: finalRowsCidade,
      totais: totais,
      ciclo: cicloData,
      ciclos_disponiveis: ciclos_disponiveis,
      evolutivo_diario: evolutivoRows
    });
  } catch (error) {
    console.error('Erro ao buscar dados de Producao BA:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};
