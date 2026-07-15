import pandas as pd
from sqlalchemy import create_engine
import sys
import unicodedata

if len(sys.argv) > 1:
    file_path = sys.argv[1]
else:
    file_path = r'C:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos\Técnicos Automático.xlsx'
    
engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

df = pd.read_excel(file_path)

def clean_col(col):
    col = str(col).strip().lower()
    col = unicodedata.normalize('NFKD', col).encode('ASCII', 'ignore').decode('utf-8')
    col = col.replace(' ', '_').replace('.', '')
    return col

df.columns = [clean_col(c) for c in df.columns]

# Write to db
df.to_sql('tecnicos', engine, schema='importador', if_exists='replace', index=False)
print("Table importador.tecnicos created successfully with", len(df), "rows.")
