from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

with engine.connect() as conn:
    res = conn.execute(text("""
        SELECT count(*) as total, sum(case when dups > 1 then dups else 0 end) as duplicated_rows
        FROM (
            SELECT n_mero_da_ordem_de_servi_o, count(*) as dups
            FROM importador.zeus_consolidado
            WHERE n_mero_da_ordem_de_servi_o IS NOT NULL AND TRIM(n_mero_da_ordem_de_servi_o) != ''
            GROUP BY n_mero_da_ordem_de_servi_o
        ) t
    """))
    row = res.fetchone()
    print(f"Total Unique OSs: {row[0]}")
    print(f"Total Duplicated Rows: {row[1]}")
