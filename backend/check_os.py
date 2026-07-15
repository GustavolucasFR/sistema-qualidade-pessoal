import psycopg2
conn = psycopg2.connect("dbname='postgres' user='postgres' host='localhost' password='postgres'")
cur = conn.cursor()
cur.execute("SELECT status, tipo_de_atividade FROM importador.zeus_consolidado WHERE n_mero_da_ordem_de_servi_o = '7671334842:76905976'")
print(cur.fetchall())
