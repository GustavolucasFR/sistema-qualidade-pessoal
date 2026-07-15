import pandas as pd
import json
import sys
import os
from sqlalchemy import create_engine

def parse_excel_dates(col):
    numeric = pd.to_numeric(col, errors='coerce')
    dates_num = pd.to_datetime(numeric, origin='1899-12-30', unit='D')
    dates_str = pd.to_datetime(col[numeric.isna()], format='mixed', errors='coerce')
    return dates_num.combine_first(dates_str)

def main():
    engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
    uploads_dir = r'C:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos'

    files = {
        'Consolidado_Produtividade': (os.path.join(uploads_dir, 'Consolidado_Produtividade.xlsb'), 'Zeus', 'metricas_produtividade'),
        'TMA': (os.path.join(uploads_dir, 'Relatório_Tempo_Médio_Atividades_v2.xlsb'), 'ZEUS', 'metricas_tma'),
        'TDNA': (os.path.join(uploads_dir, 'TDNA.xlsb'), 'Zeus', 'metricas_tdna')
    }

    for name, (path, sheet, table_name) in files.items():
        print(f"Processando {name} do arquivo {os.path.basename(path)} (aba {sheet})...")
        if not os.path.exists(path):
            print(f"Arquivo não encontrado: {path}")
            continue

        try:
            print(f"Lendo primeiras 50 linhas para detectar cabecalho de {name}...")
            # detect header row
            df_head = pd.read_excel(path, engine='pyxlsb', sheet_name=sheet, nrows=50, header=None)
            header_idx = 0
            for idx, row in df_head.iterrows():
                row_str = ' '.join([str(x).upper() for x in row.values])
                if 'TECNICO' in row_str or 'TÉCNICO' in row_str or 'CLUSTER' in row_str or 'DURA' in row_str or 'PESO' in row_str:
                    header_idx = idx
                    break
                    
            print(f"Cabecalho detectado na linha {header_idx}. Carregando arquivo completo...")
            df = pd.read_excel(path, engine='pyxlsb', sheet_name=sheet, header=header_idx)
            print(f"Lidas {len(df)} linhas de {name}.")

            if df.empty:
                print(f"Arquivo {name} vazio ou aba {sheet} vazia.")
                continue

            # Cleanup headers
            df = df.dropna(axis=1, how='all')
            df.columns = [str(c).strip() for c in df.columns]

            # In TDNA, data might be nested or have empty rows at top
            if 'ID do Técnico' not in df.columns and 'TÉCNICO' not in df.columns and 't_cnico' not in [c.lower() for c in df.columns]:
                print(f"Aviso: Colunas de técnico não encontradas em {name}. Colunas: {list(df.columns)}")

            # Sanitize columns
            def sanitize_col(col):
                import re
                col = col.lower()
                col = re.sub(r'[^a-z0-9_]', '_', col)
                col = re.sub(r'_+', '_', col)
                return col.strip('_')

            df.columns = [sanitize_col(c) for c in df.columns]

            # Deduplicate columns
            cols = pd.Series(df.columns)
            for dup in cols[cols.duplicated()].unique():
                cols[cols[cols == dup].index.values.tolist()] = [dup + '_' + str(i) if i != 0 else dup for i in range(sum(cols == dup))]
            df.columns = cols
            
            # Convert objects to string to prevent SQLAlchemy errors
            for col in df.columns:
                if str(df[col].dtype) == 'object':
                    df[col] = df[col].astype(str)
                # Convert dates if they look like dates
                if 'data' in col or 'date' in col:
                     try:
                         df[col] = parse_excel_dates(df[col])
                     except:
                         pass

            print(f"Inserindo {len(df)} linhas em {table_name}...")
            df.to_sql(table_name, engine, schema='importador', if_exists='replace', index=False)
            print(f"{name} processado com sucesso!")

        except Exception as e:
            print(f"Erro ao processar {name}: {e}")

if __name__ == "__main__":
    main()
