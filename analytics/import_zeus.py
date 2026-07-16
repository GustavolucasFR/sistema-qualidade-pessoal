import pandas as pd
from sqlalchemy import create_engine
import glob
import os
import re
import warnings

# Ignorar os avisos de datas inválidas do openpyxl que poluem o terminal
warnings.filterwarnings('ignore', category=UserWarning, module='openpyxl')

def clean_column_names(df):
    if df.columns.empty: return df
    new_cols = []
    seen = {}
    for col in df.columns:
        # Remover acentos e caracteres especiais
        base_name = "coluna_desconhecida" if pd.isna(col) else str(col).strip().replace("\n", " ")
        base_name = re.sub(r'[^a-zA-Z0-9_]', '_', base_name)
        # Postgres converte tudo pra minusculo sem aspas, vamos manter legivel
        base_name = base_name.lower()
        
        # Tratar nomes duplicados
        if base_name in seen:
            seen[base_name] += 1
            final_name = f"{base_name}_{seen[base_name]}"
        else:
            seen[base_name] = 1
            final_name = base_name
            
        # Limitar tamanho para postgres (max 63 chars na teoria, mas vamos segurar em 60)
        final_name = final_name[:60]
        new_cols.append(final_name)
    df.columns = new_cols
    return df

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
folder_path = 'c:/Users/TECNOMULTI/sistema-qualidade/dados/1_uploads_brutos/'

print("="*60)
print(" IMPORTADOR DE DADOS DO ZEUS ")
print("="*60)

from sqlalchemy.types import Text

# Encontrar os arquivos Zeus
folder_downloads = 'c:/Users/TECNOMULTI/Downloads/'
list_of_files = []
list_of_files.extend(glob.glob(os.path.join(folder_path, '*Zeus*.xlsx')))
list_of_files.extend(glob.glob(os.path.join(folder_path, '*Zeus*.xlsb')))
list_of_files.extend(glob.glob(os.path.join(folder_downloads, '*Zeus*.xlsx')))
list_of_files.extend(glob.glob(os.path.join(folder_downloads, '*Zeus*.xlsb')))

if not list_of_files:
    print("Nenhum arquivo do Zeus encontrado!")
    exit(0)

# Processar arquivo por arquivo
all_dfs = []
for i, file_path in enumerate(sorted(list_of_files)):
    filename = os.path.basename(file_path)
    print(f"[{i+1}/{len(list_of_files)}] Processando: {filename}...")
    
    try:
        # Tentar encontrar a linha do cabeçalho
        engine_type = 'pyxlsb' if filename.endswith('.xlsb') else 'openpyxl'
        df_temp = pd.read_excel(file_path, engine=engine_type, header=None, nrows=20)
        
        header_idx = None
        for idx, row in df_temp.iterrows():
            row_str = ' '.join([str(v).lower() for v in row.values])
            if 'tecnicos' in row_str and 'status' in row_str and 'cidade' in row_str:
                header_idx = idx
                break
                
        if header_idx is None:
            print(f"  [AVISO] Cabeçalho (Tecnicos, Status, Cidade) não encontrado nas primeiras 20 linhas de {filename}. Usando primeira linha.")
            header_idx = 0
            
        df = pd.read_excel(file_path, engine=engine_type, header=header_idx)
        df = clean_column_names(df)
        df['arquivo_origem'] = filename
        df = df.astype(str)
        all_dfs.append(df)
    except Exception as e:
        print(f"[ERRO] Falha ao processar {filename}: {e}")

if not all_dfs:
    print("Nenhum dado lido com sucesso.")
    exit(0)

print("Concatenando todos os meses...")
final_df = pd.concat(all_dfs, ignore_index=True)

from sqlalchemy import text

print("Inserindo no banco de dados...")
dtypes = {c: Text() for c in final_df.columns}
with engine.begin() as conn:
    conn.execute(text("TRUNCATE TABLE importador.zeus_consolidado"))
final_df.to_sql('zeus_consolidado', engine, schema='importador', if_exists='append', index=False, dtype=dtypes)
print("Insercao finalizada.")

for file_path in list_of_files:
    try:
        os.remove(file_path)
        print(f"  - Arquivo {os.path.basename(file_path)} apagado.")
    except:
        pass

print("="*60)
print("TODAS AS IMPORTACOES DO ZEUS FORAM CONCLUIDAS!")
print("="*60)
