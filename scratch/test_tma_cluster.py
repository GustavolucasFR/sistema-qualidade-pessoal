import pandas as pd
from sqlalchemy import create_engine

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
df = pd.read_sql("SELECT cluster, count(*) FROM importador.metricas_tma GROUP BY cluster ORDER BY count DESC;", engine)
print(df)
