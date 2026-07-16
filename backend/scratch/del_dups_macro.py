from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

with engine.begin() as conn:
    print("Deletando duplicadas de macro_atividades...")
    conn.execute(text("""
        DELETE FROM importador.macro_atividades
        WHERE ctid NOT IN (
            SELECT min(ctid)
            FROM importador.macro_atividades
            GROUP BY UPPER(TRIM(atividade_zeus))
        )
    """))
    print("Concluído.")
