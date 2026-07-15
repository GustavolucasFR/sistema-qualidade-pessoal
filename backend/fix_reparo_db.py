import pandas as pd
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
file_path = 'C:/Users/TECNOMULTI/sistema-qualidade/dados/1_uploads_brutos/ProduçãoBA_12072026.xlsb'

df_extra = pd.read_excel(file_path, engine='calamine', sheet_name='Extra')

col_reparo_chave = None
col_reparo_valor = None
col_prev_chave = None
col_prev_valor = None

for c in df_extra.columns:
    c_clean = str(c).strip()
    if c_clean == 'CHAVE.1': col_reparo_chave = c
    elif c_clean == 'VALORES': col_reparo_valor = c
    elif c_clean == 'Chave': col_prev_chave = c
    elif c_clean == 'Valor': col_prev_valor = c

if col_reparo_chave and col_reparo_valor:
    df_reparo = df_extra[[col_reparo_chave, col_reparo_valor]].dropna(subset=[col_reparo_chave])
    df_reparo = df_reparo.rename(columns={col_reparo_chave: 'chave', col_reparo_valor: 'valor'})
    df_reparo = df_reparo[df_reparo['chave'].str.strip() != '']
    df_reparo['valor'] = pd.to_numeric(df_reparo['valor'], errors='coerce').fillna(0)
    with engine.connect() as con:
        con.execute(text("DROP TABLE IF EXISTS importador.regras_reparo_extra;"))
        con.execute(text("CREATE TABLE importador.regras_reparo_extra (chave text, valor double precision);"))
        con.commit()
    df_reparo.to_sql('regras_reparo_extra', engine, schema='importador', if_exists='append', index=False)
    print(f"Aba Extra (Reparo) salva com sucesso! ({len(df_reparo)} regras inseridas)")

if col_prev_chave and col_prev_valor:
    df_prev = df_extra[[col_prev_chave, col_prev_valor]].dropna(subset=[col_prev_chave])
    df_prev = df_prev.rename(columns={col_prev_chave: 'chave', col_prev_valor: 'valor'})
    df_prev = df_prev[df_prev['chave'].str.strip() != '']
    df_prev['valor'] = pd.to_numeric(df_prev['valor'], errors='coerce').fillna(0)
    with engine.connect() as con:
        con.execute(text("DROP TABLE IF EXISTS importador.regras_preventivas_extra;"))
        con.execute(text("CREATE TABLE importador.regras_preventivas_extra (chave text, valor double precision);"))
        con.commit()
    df_prev.to_sql('regras_preventivas_extra', engine, schema='importador', if_exists='append', index=False)
    print(f"Aba Extra (Preventivas) salva com sucesso! ({len(df_prev)} regras inseridas)")
