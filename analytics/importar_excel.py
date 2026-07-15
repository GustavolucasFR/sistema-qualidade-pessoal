import os
import sys
import re
import pandas as pd
from sqlalchemy import create_engine
import unicodedata
import shutil
import warnings

warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")

# Forçar output em UTF-8 no Windows
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd
from sqlalchemy import create_engine
import unicodedata

def clean_column_names(df):
    """Limpa os nomes das colunas e garante que são únicos."""
    if df.columns.empty:
        return df
    new_cols = []
    seen = {}
    for col in df.columns:
        if pd.isna(col):
            base_name = "coluna_desconhecida"
        else:
            base_name = str(col).strip().replace("\n", " ").replace("\r", " ")
        
        # Garante nome único
        if base_name in seen:
            seen[base_name] += 1
            final_name = f"{base_name}_{seen[base_name]}"
        else:
            seen[base_name] = 1
            final_name = base_name
            
        new_cols.append(final_name)
    df.columns = new_cols
    return df

def find_header_row(df_raw):
    """
    Tenta encontrar a linha de cabeçalho verdadeira caso o Pandas tenha lido
    um título ou linhas em branco no início.
    """
    # Verifica se as colunas atuais parecem válidas (menos de 50% Unnamed)
    unnamed_count = sum(1 for c in df_raw.columns if "Unnamed" in str(c))
    if unnamed_count < len(df_raw.columns) / 2:
        return df_raw # Cabeçalho parece ok

    print("Cabeçalho padrão tem muitas colunas 'Unnamed', tentando encontrar o cabeçalho real...")
    
    # Procura nas primeiras 20 linhas qual tem mais strings não nulas
    best_row_idx = 0
    max_valid_cols = 0
    
    for i in range(min(20, len(df_raw))):
        row = df_raw.iloc[i]
        valid_cols = sum(1 for x in row if pd.notna(x) and str(x).strip() != "")
        if valid_cols > max_valid_cols:
            max_valid_cols = valid_cols
            best_row_idx = i
            
    if max_valid_cols > 0:
        print(f"Cabeçalho encontrado na linha {best_row_idx + 2} do Excel.")
        new_header = df_raw.iloc[best_row_idx]
        df_real = df_raw[best_row_idx + 1:].copy()
        df_real.columns = new_header
        df_real.reset_index(drop=True, inplace=True)
        return df_real
    else:
        return df_raw

def normalize_table_name(filename):
    """Gera um nome de tabela PostgreSQL válido a partir do nome do arquivo."""
    name, _ = os.path.splitext(filename)
    # Remove acentos
    name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
    # Substitui caracteres não alfanuméricos por underscore
    name = re.sub(r'[^a-zA-Z0-9_]', '_', name)
    name = name.lower()
    return name

def import_files():
    base_dir = os.path.dirname(__file__)
    uploads_dir = os.path.abspath(os.path.join(base_dir, '..', 'dados', '1_uploads_brutos'))
    consolidados_dir = os.path.abspath(os.path.join(base_dir, '..', 'dados', '2_dados_consolidados'))
    
    if not os.path.exists(uploads_dir):
        print(f"Diretório não encontrado: {uploads_dir}")
        return
        
    os.makedirs(consolidados_dir, exist_ok=True)

    try:
        engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return

    for filename in os.listdir(uploads_dir):
        if filename.endswith('.xlsb') or filename.endswith('.xlsx') or filename.endswith('.csv'):
            file_path = os.path.join(uploads_dir, filename)
            table_name = normalize_table_name(filename)
            
            print(f"\n[{filename}] Iniciando leitura do arquivo...")
            try:
                sheet = None
                if 'ProduçãoBA' in filename or 'ProducaoBA' in filename:
                    sheet = 'Zeus'
                    table_name = 'producao_ba'
                    print(f"[{filename}] Forçando leitura da sheet 'Zeus' e tabela 'producao_ba'...")
                    
                if filename.endswith('.csv'):
                    df_preview = pd.read_csv(file_path, sep=';', nrows=100, encoding='latin1', on_bad_lines='skip')
                else:
                    engine_type = 'pyxlsb' if filename.endswith('.xlsb') else 'openpyxl'
                    if sheet:
                        df_preview = pd.read_excel(file_path, sheet_name=sheet, engine=engine_type, nrows=100)
                    else:
                        df_preview = pd.read_excel(file_path, engine=engine_type, nrows=100)
                
                # Se preview já diz que o cabeçalho não é a primeira linha, calculamos quantas linhas pular
                unnamed_count = sum(1 for c in df_preview.columns if "Unnamed" in str(c))
                skip_rows = 0
                
                if unnamed_count >= len(df_preview.columns) / 2:
                    max_valid_cols = 0
                    for i in range(len(df_preview)):
                        row = df_preview.iloc[i]
                        valid_cols = sum(1 for x in row if pd.notna(x) and str(x).strip() != "")
                        if valid_cols > max_valid_cols:
                            max_valid_cols = valid_cols
                            skip_rows = i + 1 # +1 porque iloc 0 é a linha 2 do Excel (a 1 é o cabeçalho lido)
                            
                if skip_rows > 0:
                    print(f"[{filename}] Pulando as primeiras {skip_rows} linhas...")
                    
                # Leitura completa
                print(f"[{filename}] Carregando todos os dados para a memória...")
                if filename.endswith('.csv'):
                    df = pd.read_csv(file_path, sep=';', skiprows=skip_rows, encoding='latin1', on_bad_lines='skip')
                else:
                    if sheet:
                        df = pd.read_excel(file_path, sheet_name=sheet, engine=engine_type, skiprows=skip_rows)
                    else:
                        df = pd.read_excel(file_path, engine=engine_type, skiprows=skip_rows)
                
                df = clean_column_names(df)
                
                print(f"[{filename}] Inserindo dados na tabela 'importador.{table_name}'...")
                
                # Para evitar problemas com tabelas muito grandes, inserimos em chunks
                df.to_sql(table_name, engine, schema='importador', if_exists='replace', index=False, chunksize=1000)
                
                print(f"[{filename}] ✅ Sucesso! Tabela {table_name} atualizada ({len(df)} linhas).")
                
                # Mover o arquivo para a pasta de processados
                dest_path = os.path.join(consolidados_dir, filename)
                # Se já existir, remove para não dar erro
                if os.path.exists(dest_path):
                    os.remove(dest_path)
                shutil.move(file_path, dest_path)
                print(f"[{filename}] Arquivo movido para a pasta de consolidados.")
                
            except Exception as e:
                print(f"[{filename}] ❌ Erro ao processar: {e}")

if __name__ == "__main__":
    import_files()
