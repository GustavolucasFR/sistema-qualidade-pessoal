import pandas as pd
from sqlalchemy import create_engine

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

try:
    print("Lendo...")
    df = pd.read_sql_table('backlogdiario_anterior', engine, schema='importador')
    # Force all columns to string/object to avoid type clashes
    df = df.astype(str)
    print("Salvando...")
    df.to_sql('backlogdiario_historico', engine, schema='importador', if_exists='append', index=False)
    print("Sucesso!")
except Exception as e:
    print("Erro:", e)
