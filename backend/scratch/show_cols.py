import pandas as pd
from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'importador' AND table_name = 'zeus_consolidado';"))
    cols = [r[0] for r in res]
    for c in cols:
        print(c)
