import pandas as pd
from sqlalchemy import create_engine, text
import urllib.request
import os

def importar_grelha():
    print("Iniciando download da grelha de remuneração oficial...")
    url = "https://docs.google.com/spreadsheets/d/1x5GW-b-rEsLSUL6qFUcwU0J3cN18jbSeNYbjbecF0kU/export?format=csv&gid=1839021767"
    file_path = os.path.join(os.path.dirname(__file__), '..', 'dados', 'grelha_remuneracao_downloaded.csv')
    urllib.request.urlretrieve(url, file_path)
    print("Download concluído!")

    # Ler a grelha sem cabeçalhos para procurar manualmente as posições
    df = pd.read_csv(file_path, header=None)
    
    # As linhas 1 e 2 têm os cabeçalhos (a linha 0 costuma ser vazia).
    row1 = [str(x).strip() for x in df.iloc[1].tolist()]
    row2 = [str(x).strip() for x in df.iloc[2].tolist()]

    # Indices fixos com base no layout atual do Google Sheets
    idx_matricula = 2
    idx_dias = 123
    idx_pontos = 124
    idx_ifi = 107
    idx_irr = 116
    
    print(f"Indices fixos: Matricula={idx_matricula}, Dias={idx_dias}, Pontos={idx_pontos}, IFI={idx_ifi}, IRR={idx_irr}")

    records = []
    # Começar da linha 3 (índice 3)
    for i in range(3, len(df)):
        row = df.iloc[i]
        mat = str(row[idx_matricula]).strip()
        if mat == "nan" or mat == "":
            continue
            
        dias = str(row[idx_dias]).strip().replace(",", ".") if idx_dias is not None else "0"
        pontos = str(row[idx_pontos]).strip().replace(",", ".") if idx_pontos is not None else "0"
        ifi = str(row[idx_ifi]).strip().replace(",", ".").replace("%", "") if idx_ifi is not None else "0"
        irr = str(row[idx_irr]).strip().replace(",", ".").replace("%", "") if idx_irr is not None else "0"

        # Conversões seguras
        try: dias_f = float(dias) if dias != "nan" and dias != "#DIV/0!" else 0
        except: dias_f = 0
        
        try: pontos_f = float(pontos) if pontos != "nan" and pontos != "#DIV/0!" else 0
        except: pontos_f = 0
        
        try: ifi_f = float(ifi) if ifi != "nan" and ifi != "#DIV/0!" else 0
        except: ifi_f = 0
        
        try: irr_f = float(irr) if irr != "nan" and irr != "#DIV/0!" else 0
        except: irr_f = 0
        
        records.append((mat, dias_f, pontos_f, ifi_f, irr_f))
        
    print(f"Total de registos extraídos da grelha: {len(records)}")

    # Inserir no banco de dados
    engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS importador.remuneracao_oficial"))
        conn.execute(text("""
        CREATE TABLE importador.remuneracao_oficial (
            matricula VARCHAR(50) PRIMARY KEY,
            dias_trabalhados FLOAT,
            pontos_baremo FLOAT,
            ifi_pct FLOAT,
            irr_pct FLOAT
        )
        """))
        
        for r in records:
            conn.execute(text("""
                INSERT INTO importador.remuneracao_oficial (matricula, dias_trabalhados, pontos_baremo, ifi_pct, irr_pct)
                VALUES (:m, :d, :p, :i, :ir)
                ON CONFLICT (matricula) DO NOTHING
            """), {"m": r[0], "d": r[1], "p": r[2], "i": r[3], "ir": r[4]})
            
        conn.commit()
    print("Tabela importador.remuneracao_oficial criada com sucesso!")

if __name__ == "__main__":
    importar_grelha()
