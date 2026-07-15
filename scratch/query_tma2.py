import pandas as pd
from sqlalchemy import create_engine

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
dates = pd.read_sql("SELECT data_agendada_para_execu_o, count(*) FROM importador.metricas_tma GROUP BY data_agendada_para_execu_o LIMIT 10;", engine)
print("Dates in TMA:")
print(dates)
