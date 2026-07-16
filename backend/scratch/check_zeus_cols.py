import pandas as pd
import glob
from sqlalchemy import create_engine
import os
import re

def clean_column_names(df):
    if df.columns.empty: return df
    new_cols = []
    seen = {}
    for col in df.columns:
        base_name = "coluna_desconhecida" if pd.isna(col) else str(col).strip().replace("\n", " ")
        base_name = re.sub(r'[^a-zA-Z0-9_]', '_', base_name).lower()
        if base_name in seen:
            seen[base_name] += 1
            final_name = f"{base_name}_{seen[base_name]}"
        else:
            seen[base_name] = 1
            final_name = base_name
        new_cols.append(final_name[:60])
    df.columns = new_cols
    return df

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
from sqlalchemy import text
with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'importador' AND table_name = 'zeus_consolidado';"))
    db_cols = set([row[0] for row in res])

print("DB columns count:", len(db_cols))

files = glob.glob('c:/Users/TECNOMULTI/sistema-qualidade/dados/1_uploads_brutos/*Zeus*.xlsx') + glob.glob('c:/Users/TECNOMULTI/Downloads/*Zeus*.xlsx')

for f in files:
    try:
        df_temp = pd.read_excel(f, engine='openpyxl', header=None, nrows=20)
        header_idx = 0
        for idx, row in df_temp.iterrows():
            row_str = ' '.join([str(v).lower() for v in row.values])
            if 'tecnicos' in row_str and 'status' in row_str and 'cidade' in row_str:
                header_idx = idx
                break
        df = pd.read_excel(f, engine='openpyxl', header=header_idx, nrows=5)
        df = clean_column_names(df)
        df_cols = set(df.columns)
        new_cols = df_cols - db_cols
        print(f"File {os.path.basename(f)} has new cols not in DB: {new_cols}")
    except Exception as e:
        print("Error on", f, e)
