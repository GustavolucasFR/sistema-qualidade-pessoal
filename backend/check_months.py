import psycopg2
conn = psycopg2.connect("dbname='postgres' user='postgres' host='localhost' password='postgres'")
cur = conn.cursor()
cur.execute("SELECT DATE_TRUNC('month', data_agendada_para_execu__o::date), COUNT(*) FROM importador.zeus_consolidado GROUP BY 1 ORDER BY 1")
print(cur.fetchall())
