import pandas as pd
from sqlalchemy import create_engine
import unicodedata

file_path = r'C:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos\LPU_LA.xlsb'
engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

df = pd.read_excel(file_path, engine='pyxlsb')

def clean_col(col):
    col = str(col).strip().lower()
    col = unicodedata.normalize('NFKD', col).encode('ASCII', 'ignore').decode('utf-8')
    col = col.replace(' ', '_').replace('.', '').replace('r$_', 'rs_').replace('$', 's')
    return col

df.columns = [clean_col(c) for c in df.columns]

# Write to db
df.to_sql('lpu', engine, schema='importador', if_exists='replace', index=False)
print("Table importador.lpu created successfully with", len(df), "rows.")
