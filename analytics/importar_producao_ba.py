import pandas as pd
from sqlalchemy import create_engine
import sys
import os
import glob

upload_dir = r"c:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos"
search_patterns = [os.path.join(upload_dir, "ProducaoBA*.xlsb"), os.path.join(upload_dir, "ProduçãoBA*.xlsb")]

files = []
for p in search_patterns:
    files.extend(glob.glob(p))

if not files:
    print(f"[AVISO] Nenhum arquivo ProducaoBA encontrado em {upload_dir}. Pulando importacao.")
    sys.exit(0)

# Pega o arquivo mais recente
file_path = max(files, key=os.path.getmtime)

print(f"Lendo o arquivo mais recente: {file_path}")

try:
    # First, find the header row
    df_temp = pd.read_excel(file_path, engine='pyxlsb', header=None, nrows=30)
    header_idx = None
    for i, row in df_temp.iterrows():
        # Look for typical header column keywords
        row_str = ' '.join([str(v) for v in row.values])
        if 'Faturamento' in row_str and 'Meta' in row_str:
            header_idx = i
            break
            
    if header_idx is None:
        print("[ERRO] Nao foi possivel encontrar a linha de cabecalho no arquivo ProducaoBA.")
        sys.exit(1)
        
    # Read the file with the correct header
    df = pd.read_excel(file_path, engine='pyxlsb', header=header_idx)
    
    # Drop rows where 'Cidade' is empty
    df = df.dropna(subset=[df.columns[1]])
    
    # Rename columns to standard names for DB
    df.columns = [
        'col_0', 'cidade', 'hc_produtivos', 'faturamento_hc', 'producao_vol', 'producao_preventiva',
        'producao_rs', 'ptbaremo_dia', 'projecao_producao', 'meta_orcada', 'gap_producao_meta',
        'gap_projecao_meta', 'executado_receita', 'executado_preventiva', 'receita_vivo',
        'receita_fibrasil', 'instalacao', 'mudanca', 'desconexao', 'producao_dia', 'col_last'
    ][:len(df.columns)]
    
    # Keep only relevant columns and clean data
    cols_to_keep = [
        'cidade', 'hc_produtivos', 'faturamento_hc', 'producao_vol', 
        'producao_rs', 'meta_orcada', 'gap_producao_meta', 'gap_projecao_meta',
        'receita_vivo', 'receita_fibrasil', 'instalacao', 'mudanca', 'desconexao'
    ]
    df = df[cols_to_keep].copy()
    
    # Remove rows that are totals or garbage (e.g. Total, Grand Total)
    df = df[~df['cidade'].str.upper().str.contains('TOTAL|ATUALIZADO', na=False)]
    
    # Convert numerical columns
    numeric_cols = cols_to_keep[1:]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
    engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
    
    print("Inserindo no BD (tabela importador.producao_ba)...")
    df.to_sql('producao_ba', engine, schema='importador', if_exists='replace', index=False)
    print("Importacao de ProducaoBA concluida com sucesso!")
    
    # Deletar o arquivo para manter a pasta limpa
    try:
        os.remove(file_path)
        print(f"Arquivo {os.path.basename(file_path)} deletado com sucesso.")
    except Exception as e:
        print(f"Aviso: Nao foi possivel deletar o arquivo {file_path}. Erro: {e}")

except Exception as e:
    print(f"[ERRO] Ocorreu um problema na importacao do ProducaoBA: {e}")
    sys.exit(1)
