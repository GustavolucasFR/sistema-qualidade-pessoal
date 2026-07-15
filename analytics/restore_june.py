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

print("Lendo 06_Base_Zeus_Jun_26.xlsx...")
file_path = 'c:/Users/TECNOMULTI/sistema-qualidade/dados/2_dados_consolidados/06_Base_Zeus_Jun_26.xlsx'
df_temp = pd.read_excel(file_path, header=None, nrows=20)

header_idx = 0
for idx, row in df_temp.iterrows():
    row_str = ' '.join([str(v).lower() for v in row.values])
    if 'tecnicos' in row_str and 'status' in row_str and 'cidade' in row_str:
        header_idx = idx
        break

df = pd.read_excel(file_path, header=header_idx)
df = clean_column_names(df)
df['arquivo_origem'] = '06_Base_Zeus_Jun_26.xlsx'
df = df.astype(str)

print("Inserindo no banco de dados com APPEND...")
engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
df.to_sql('zeus_consolidado', engine, schema='importador', if_exists='append', index=False)
print("Pronto!")
