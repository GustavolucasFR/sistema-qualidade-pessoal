import pandas as pd
import psycopg2
import sys

if len(sys.argv) > 1:
    file_path = sys.argv[1]
else:
    file_path = r'c:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos\Cópia de ProduçãoBA_07072026.xlsb'

try:
    df_extra = pd.read_excel(file_path, engine='pyxlsb', sheet_name='Extra')
    
    # Identify the correct 'AREA' column which might have encoding issues (it's around index 17)
    area_col = [c for c in df_extra.columns if 'REA' in c.upper() and '1' not in c and '2' not in c][0]
    
    # Clean the dataframe
    df_clean = df_extra[['CHAVE', 'Receita Vivo', 'Receita FiBrasil']].dropna(subset=['CHAVE'])
    df_clean = df_clean[df_clean['CHAVE'].astype(str).str.strip() != '0']
    
    # Drop duplicates by CHAVE
    df_clean['CHAVE'] = df_clean['CHAVE'].astype(str).str.strip()
    df_clean = df_clean.drop_duplicates(subset=['CHAVE'])
    
    conn = psycopg2.connect("dbname='postgres' user='postgres' host='localhost' password='postgres'")
    cur = conn.cursor()
    
    cur.execute("TRUNCATE TABLE importador.regras_receita;")
    print("Truncated importador.regras_receita")
    
    inserted = 0
    for index, row in df_clean.iterrows():
        chave = row['CHAVE']
        r_vivo = pd.to_numeric(row['Receita Vivo'], errors='coerce')
        r_fibrasil = pd.to_numeric(row['Receita FiBrasil'], errors='coerce')
        
        # Replace NaN with 0
        r_vivo = r_vivo if pd.notna(r_vivo) else 0
        r_fibrasil = r_fibrasil if pd.notna(r_fibrasil) else 0
        
        cur.execute("""
            INSERT INTO importador.regras_receita (chave, receita_vivo, receita_fibrasil)
            VALUES (%s, %s, %s)
            ON CONFLICT (chave) DO NOTHING
        """, (chave, r_vivo, r_fibrasil))
        inserted += 1
        
    conn.commit()
    print(f"Successfully inserted {inserted} rules into importador.regras_receita")
    
except Exception as e:
    import traceback
    traceback.print_exc()
