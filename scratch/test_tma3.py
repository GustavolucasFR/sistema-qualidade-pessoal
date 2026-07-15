from sqlalchemy import create_engine
from sqlalchemy.sql import text

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
query = text("""
    SELECT DISTINCT dura_o 
    FROM importador.metricas_tma 
    WHERE TRIM(dura_o) = '' OR TRIM(dura_o) = '-' OR dura_o !~ '^[0-9\.]+$'
    LIMIT 10;
""")

try:
    with engine.connect() as conn:
        result = conn.execute(query)
        for row in result:
            print(repr(row[0]))
except Exception as e:
    print(str(e))
