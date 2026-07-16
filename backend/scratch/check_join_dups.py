from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

with engine.connect() as conn:
    print("Checking tecnicos...")
    res = conn.execute(text("SELECT mat_vivo, count(*) FROM importador.tecnicos GROUP BY mat_vivo HAVING count(*) > 1"))
    print("tecnicos dups:", res.fetchall())
    
    print("Checking macro_atividades...")
    res = conn.execute(text("SELECT UPPER(TRIM(atividade_zeus)), count(*) FROM importador.macro_atividades GROUP BY UPPER(TRIM(atividade_zeus)) HAVING count(*) > 1"))
    print("macro_atividades dups:", res.fetchall())
    
    print("Checking regras_receita...")
    res = conn.execute(text("SELECT UPPER(TRIM(chave)), count(*) FROM importador.regras_receita GROUP BY UPPER(TRIM(chave)) HAVING count(*) > 1"))
    print("regras_receita dups:", res.fetchall())
    
    print("Checking regras_receita_extra...")
    res = conn.execute(text("SELECT UPPER(TRIM(chave)), count(*) FROM importador.regras_receita_extra GROUP BY UPPER(TRIM(chave)) HAVING count(*) > 1"))
    print("regras_receita_extra dups:", res.fetchall())
