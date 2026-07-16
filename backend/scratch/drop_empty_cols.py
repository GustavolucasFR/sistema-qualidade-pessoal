import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
with engine.connect() as conn:
    print("Buscando dados...")
    res = conn.execute(text("SELECT * FROM importador.zeus_consolidado;"))
    df = pd.DataFrame(res.fetchall(), columns=res.keys())
    
    if len(df) == 0:
        print("Tabela vazia, nada a fazer.")
        exit(0)
        
    empty_cols = []
    for col in df.columns:
        is_null = df[col].isna()
        is_empty_str = df[col].astype(str).str.strip().isin(['', 'nan', 'None', 'null', 'NaN', '<NA>'])
        empty_count = (is_null | is_empty_str).sum()
        pct = (empty_count / len(df)) * 100
        
        if pct == 100:
            empty_cols.append(col)
            
    if empty_cols:
        print(f"Encontradas {len(empty_cols)} colunas 100% vazias. Removendo...")
        for col in empty_cols:
            try:
                conn.execute(text(f'ALTER TABLE importador.zeus_consolidado DROP COLUMN "{col}";'))
                print(f"[-] Coluna '{col}' removida com sucesso.")
            except Exception as e:
                print(f"Erro ao remover coluna '{col}': {e}")
        # commit transaction
        conn.commit()
    else:
        print("Nenhuma coluna 100% vazia encontrada.")
        
    print("Limpeza concluída.")
