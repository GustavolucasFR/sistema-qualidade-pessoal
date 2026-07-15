import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text

def build_base():
    engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
    
    print("Construindo base_de_tecnicos a partir dos dados brutos...")
    query = """
    CREATE TABLE IF NOT EXISTS importador.base_de_tecnicos (
        matricula VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(255)
    );
    
    -- Tenta inserir da tabela jun
    INSERT INTO importador.base_de_tecnicos (matricula, nome)
    SELECT DISTINCT "Matricula Operador", "Tecnicos"
    FROM importador.jun
    WHERE "Matricula Operador" IS NOT NULL 
      AND "Matricula Operador" != ''
      AND "Tecnicos" IS NOT NULL
    ON CONFLICT (matricula) DO NOTHING;
    """
    
    try:
        with engine.connect() as conn:
            conn.execute(text(query))
            conn.commit()
            print("Base de técnicos criada/atualizada com sucesso!")
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    build_base()
