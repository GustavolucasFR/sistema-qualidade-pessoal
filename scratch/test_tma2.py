from sqlalchemy import create_engine
from sqlalchemy.sql import text

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
query = text("""
    SELECT 
        cluster,
        COUNT(*) as total_atividades,
        AVG(CAST(COALESCE(NULLIF(dura_o, ''), '0') as numeric)) as tma_medio
    FROM importador.metricas_tma
    WHERE (status ILIKE '%CONCLU%' OR status ILIKE '%COMPLETA%')
    AND TO_CHAR(data_agendada_para_execu_o::timestamp, 'YYYY-MM') = '2026-06'
    GROUP BY cluster
    ORDER BY tma_medio ASC
""")

try:
    with engine.connect() as conn:
        result = conn.execute(query)
        for row in result:
            print(row)
except Exception as e:
    print(str(e))
