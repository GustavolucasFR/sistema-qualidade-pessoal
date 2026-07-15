import pandas as pd
from sqlalchemy import create_engine
import warnings
import re

warnings.filterwarnings('ignore', category=UserWarning, module='openpyxl')

def clean_column_names(df):
    if df.columns.empty: return df
    new_cols = []
    seen = {}
    for col in df.columns:
        base_name = "coluna_desconhecida" if pd.isna(col) else str(col).strip().replace("\n", " ")
        base_name = re.sub(r'[^a-zA-Z0-9_]', '_', base_name)
        base_name = base_name.lower()
        if base_name in seen:
            seen[base_name] += 1
            final_name = f"{base_name}_{seen[base_name]}"
        else:
            seen[base_name] = 1
            final_name = base_name
        final_name = final_name[:60]
        new_cols.append(final_name)
    df.columns = new_cols
    return df

print("Lendo ProducaoBA.xlsb (Sheet: Zeus)...")
file_path = 'c:/Users/TECNOMULTI/sistema-qualidade/dados/2_dados_consolidados/ProducaoBA.xlsb'
df = pd.read_excel(file_path, sheet_name='Zeus', engine='pyxlsb')

print("Limpando colunas...")
df = clean_column_names(df)

print("Filtrando dados anteriores a Junho de 2026...")
if 'data_agendada_para_execu__o' in df.columns:
    df['data_agendada_para_execu__o'] = pd.to_datetime(df['data_agendada_para_execu__o'], unit='D', origin='1899-12-30', errors='coerce')
    df_filtered = df[df['data_agendada_para_execu__o'] < '2026-06-01'].copy()
else:
    print("Coluna de data não encontrada!")
    exit(1)

df_filtered['arquivo_origem'] = 'ProducaoBA.xlsb'
df_filtered = df_filtered.astype(str)

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

print("Buscando colunas existentes no banco...")
with engine.connect() as conn:
    from sqlalchemy import text
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema='importador' AND table_name='zeus_consolidado'"))
    db_cols = [row[0] for row in res]

cols_to_keep = [c for c in df_filtered.columns if c in db_cols]
df_filtered = df_filtered[cols_to_keep]

print(f"Inserindo {len(df_filtered)} registros no banco de dados com APPEND...")
df_filtered.to_sql('zeus_consolidado', engine, schema='importador', if_exists='append', index=False, chunksize=1000)
print("Pronto!")
