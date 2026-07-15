import pandas as pd
from sqlalchemy import create_engine
import os
import sys

def importar_armarios():
    print("Iniciando importação de armários...")
    file_path = r'C:\Users\TECNOMULTI\Downloads\armarios da tecnomulti.xlsb'
    
    if not os.path.exists(file_path):
        print(f"Erro: Arquivo não encontrado em {file_path}")
        return False

    try:
        df = pd.read_excel(file_path, engine='pyxlsb')
        df.columns = [c.strip().upper().replace('Ç', 'C').replace('Õ', 'O').replace('Ã', 'A').replace(' ', '_') for c in df.columns]
        # Rename NOME_ARMARIO to ARMARIO just to be safe
        if 'NOME_ARMARIO' in df.columns:
            df.rename(columns={'NOME_ARMARIO': 'ARMARIO'}, inplace=True)
        if 'SITUACAO' not in df.columns:
            # Fallback if the replacement failed
            for c in df.columns:
                if 'SITUA' in c:
                    df.rename(columns={c: 'SITUACAO'}, inplace=True)

            
        engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
        df.to_sql('armarios_tecnomulti', engine, schema='importador', if_exists='replace', index=False)
        print(f"Sucesso! {len(df)} armários importados para importador.armarios_tecnomulti.")
        return True
    except Exception as e:
        print(f"Erro ao importar: {e}")
        return False

if __name__ == '__main__':
    importar_armarios()
