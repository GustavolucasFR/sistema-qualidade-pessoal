from sqlalchemy import create_engine
import pandas as pd

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

query = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'metricas_tma' AND column_name = 'dura_o';"
df = pd.read_sql(query, engine)
print(df)
