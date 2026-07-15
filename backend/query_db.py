import psycopg2
conn = psycopg2.connect("dbname='postgres' user='postgres' host='localhost' password='postgres'")
cur = conn.cursor()
cur.execute("SELECT * FROM importador.regras_receita WHERE chave ILIKE '%Instalação Triple Play%'")
for row in cur.fetchall():
    print(row)
