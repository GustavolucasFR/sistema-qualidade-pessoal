const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
});

const getTMA = async (req, res) => {
    try {
        const { mes } = req.query;
        let dateFilter = "";
        let queryParams = [];

        if (mes && mes !== 'Todos') {
            dateFilter = " AND TO_CHAR(rsz.data_execucao, 'YYYY-MM') = $1";
            queryParams.push(mes);
        }
        
        let rlsFilter = '';
        if (req.userRole === 'TECNICO') {
            rlsFilter = ` AND UPPER(TRIM(rsz.tecnico)) = (SELECT UPPER(TRIM(nome)) FROM importador.base_de_tecnicos WHERE TRIM(matricula) = '${req.username}' LIMIT 1) `;
        }

        const queryCluster = `
            SELECT 
                COALESCE(rsz.cidade, 'N/A') as cluster,
                COUNT(*) as total_atividades,
                AVG(EXTRACT(EPOCH FROM rsz.tempo_execucao::time)/3600) as tma_medio
            FROM importador.resultados_sla_zeus rsz
            WHERE rsz.tempo_execucao IS NOT NULL AND rsz.status ILIKE 'conclu%'
            AND rsz.cidade IS NOT NULL AND TRIM(rsz.cidade) != '' AND TRIM(rsz.cidade) != '-'
            ${dateFilter} ${rlsFilter}
            GROUP BY rsz.cidade
            ORDER BY tma_medio DESC
        `;

        const queryDia = `
            SELECT 
                TO_CHAR(rsz.data_execucao, 'DD/MM') as dia,
                COUNT(*) as total_atividades,
                AVG(EXTRACT(EPOCH FROM rsz.tempo_execucao::time)/3600) as tma_medio
            FROM importador.resultados_sla_zeus rsz
            WHERE rsz.tempo_execucao IS NOT NULL AND rsz.status ILIKE 'conclu%'
            ${dateFilter} ${rlsFilter}
            GROUP BY rsz.data_execucao
            ORDER BY rsz.data_execucao ASC
        `;

        const resCluster = await pool.query(queryCluster, queryParams);
        const resDia = await pool.query(queryDia, queryParams);

        res.json({
            por_cluster: resCluster.rows,
            por_dia: resDia.rows
        });
    } catch (err) {
        console.error('Error fetching TMA:', err);
        res.status(500).json({ erro: 'Erro ao buscar dados de TMA.' });
    }
};
const getTMR = async (req, res) => {
    try {
        const { mes } = req.query;
        let dateFilter = "";
        let queryParams = [];

        if (mes && mes !== 'Todos') {
            dateFilter = " AND TO_CHAR(data_agendada_para_execu__o, 'YYYY-MM') = $1";
            queryParams.push(mes);
        }

        const baseQuery = `
          WITH raw_data AS (
            SELECT 
              cidade as cluster,
              data_agendada_para_execu__o::date as data_base,
              (CASE 
                 WHEN t_rmino_da_atividade LIKE '%-%' THEN t_rmino_da_atividade::timestamp
                 ELSE (SUBSTRING(data_agendada_para_execu__o::text FROM 1 FOR 10) || ' ' || t_rmino_da_atividade)::timestamp
               END) as data_encerramento,
              data_de_cria__o_da_atividade::timestamp as data_abertura
            FROM importador.zeus_consolidado
            WHERE tipo_de_atividade ILIKE '%defeito%'
              AND (status ILIKE '%conclu%' OR status ILIKE '%cancel%')
              AND data_agendada_para_execu__o IS NOT NULL
              AND t_rmino_da_atividade IS NOT NULL
              AND data_de_cria__o_da_atividade IS NOT NULL
              ${dateFilter}
          )
        `;

        const queryCluster = `
            ${baseQuery}
            SELECT 
                COALESCE(cluster, 'N/A') as cluster,
                COUNT(*) as total_atividades,
                AVG(EXTRACT(EPOCH FROM (data_encerramento - data_abertura))/3600) as tmr_horas
            FROM raw_data
            WHERE TRIM(cluster) != '' AND TRIM(cluster) != '-'
            GROUP BY cluster
            ORDER BY tmr_horas DESC
        `;

        const queryDia = `
            ${baseQuery}
            SELECT 
                TO_CHAR(data_base, 'DD/MM') as dia,
                COUNT(*) as total_atividades,
                AVG(EXTRACT(EPOCH FROM (data_encerramento - data_abertura))/3600) as tmr_horas
            FROM raw_data
            GROUP BY data_base
            ORDER BY data_base ASC
        `;

        const resCluster = await pool.query(queryCluster, queryParams);
        const resDia = await pool.query(queryDia, queryParams);

        res.json({
            por_cluster: resCluster.rows,
            por_dia: resDia.rows
        });
    } catch (err) {
        console.error('Error fetching TMR:', err);
        res.status(500).json({ erro: 'Erro ao buscar dados de TMR.' });
    }
};

const getTDNA = async (req, res) => {
    try {
        const { mes } = req.query;
        let dateFilter = "";
        let queryParams = [];

        if (mes && mes !== 'Todos') {
            dateFilter = " AND TO_CHAR(data_agendada_para_execu_o::timestamp, 'YYYY-MM') = $1";
            queryParams.push(mes);
        }

        let rlsFilter = '';
        if (req.userRole === 'TECNICO') {
            rlsFilter = ` AND UPPER(TRIM(tecnicos)) = (SELECT UPPER(TRIM(nome)) FROM importador.base_de_tecnicos WHERE TRIM(matricula) = '${req.username}' LIMIT 1) `;
        }

        const queryMotivos = `
            SELECT 
                motivo_de_cancelamento as motivo,
                COUNT(*) as total
            FROM importador.metricas_tdna
            WHERE (status ILIKE '%CANCELAD%' OR status ILIKE '%INCOMPLETA%')
            ${dateFilter} ${rlsFilter}
            GROUP BY motivo_de_cancelamento
            ORDER BY total DESC
            LIMIT 10
        `;
        
        const queryTecnicos = `
            SELECT 
                mt.t_cnico as tecnico,
                mt.empresa,
                COUNT(*) as falhas_tdna
            FROM importador.metricas_tdna mt
            INNER JOIN importador.base_de_tecnicos bt ON bt.nome = mt.t_cnico
            WHERE (mt.status ILIKE '%CANCELAD%' OR mt.status ILIKE '%INCOMPLETA%')
            AND mt.t_cnico IS NOT NULL AND LENGTH(TRIM(mt.t_cnico)) > 2 AND mt.t_cnico != 'nan'
            ${dateFilter.replace('data_agendada_para_execu_o', 'mt.data_agendada_para_execu_o')} ${rlsFilter.replace('tecnicos', 'mt.t_cnico')}
            GROUP BY mt.t_cnico, mt.empresa
            ORDER BY falhas_tdna DESC
            LIMIT 20
        `;
        
        const [resMotivos, resTecnicos] = await Promise.all([
            pool.query(queryMotivos, queryParams),
            pool.query(queryTecnicos, queryParams)
        ]);
        
        res.json({
            motivos: resMotivos.rows,
            tecnicos: resTecnicos.rows
        });
    } catch (err) {
        console.error('Error fetching TDNA:', err);
        res.status(500).json({ erro: 'Erro ao buscar dados de TDNA.' });
    }
};

const getProdutividade = async (req, res) => {
    try {
        const { mes } = req.query;
        let dateFilter = "";
        let queryParams = [];

        if (mes && mes !== 'Todos') {
            dateFilter = " AND TO_CHAR(data_agendada_para_execu_o::timestamp, 'YYYY-MM') = $1";
            queryParams.push(mes);
        }

        // Query to get total peso per technician
        const query = `
            SELECT 
                mp.tecnicos as tecnico,
                mp.empresa as empresa,
                SUM(CAST(COALESCE(NULLIF(mp.peso::text, ''), '0') as numeric)) as peso_total,
                COUNT(*) as atividades_concluidas
            FROM importador.metricas_produtividade mp
            INNER JOIN importador.base_de_tecnicos bt ON bt.nome = mp.tecnicos
            WHERE (mp.status ILIKE '%CONCLU%' OR mp.status ILIKE '%COMPLETA%')
            AND mp.tecnicos IS NOT NULL AND LENGTH(TRIM(mp.tecnicos)) > 2 AND mp.tecnicos != 'nan'
            ${dateFilter.replace('data_agendada_para_execu_o', 'mp.data_agendada_para_execu_o')}
            GROUP BY mp.tecnicos, mp.empresa
            ORDER BY peso_total DESC
            LIMIT 100
        `;
        const { rows } = await pool.query(query, queryParams);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching Produtividade:', err);
        res.status(500).json({ erro: 'Erro ao buscar dados de Produtividade.' });
    }
};

module.exports = {
  getTMA,
  getTDNA,
  getTMR,
  getProdutividade
};
