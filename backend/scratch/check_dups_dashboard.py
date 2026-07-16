from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

with engine.connect() as conn:
    res = conn.execute(text("""
        SELECT count(*) as total, sum(case when dups > 1 then dups else 0 end) as duplicated_rows
        FROM (
            SELECT id_os, count(*) as dups
            FROM importador.fatos_dashboard
            WHERE id_os IS NOT NULL AND TRIM(id_os) != ''
            GROUP BY id_os
        ) t
    """))
    row = res.fetchone()
    print(f"Total Unique OSs in fatos_dashboard: {row[0]}")
    print(f"Total Duplicated Rows in fatos_dashboard: {row[1]}")
