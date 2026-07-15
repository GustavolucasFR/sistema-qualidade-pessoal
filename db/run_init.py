from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

with open('init_resultados.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

with engine.begin() as conn:
    conn.execute(text(sql))

print("Tabelas criadas com sucesso!")
