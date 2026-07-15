import pandas as pd
from sqlalchemy import create_engine

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
df = pd.read_sql("SELECT * FROM importador.metricas_tma LIMIT 5;", engine)
print("Columns:", list(df.columns))

status_counts = pd.read_sql("SELECT status, count(*) FROM importador.metricas_tma GROUP BY status;", engine)
print("Status counts:")
print(status_counts)

dura_o = pd.read_sql("SELECT dura_o, count(*) FROM importador.metricas_tma GROUP BY dura_o LIMIT 5;", engine)
print("dura_o counts:")
print(dura_o)
