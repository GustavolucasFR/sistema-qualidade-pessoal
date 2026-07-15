import pandas as pd
from sqlalchemy import create_engine

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

for table in ['metricas_tma', 'metricas_tdna', 'metricas_produtividade']:
    print(f"\n--- {table} ---")
    df = pd.read_sql(f"SELECT TO_CHAR(data_agendada_para_execu_o::date, 'YYYY-MM') as mes, count(*) FROM importador.{table} GROUP BY mes ORDER BY mes;", engine)
    print(df)
