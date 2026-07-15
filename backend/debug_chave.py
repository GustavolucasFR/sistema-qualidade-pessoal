import psycopg2
import json

conn = psycopg2.connect("dbname='postgres' user='postgres' host='localhost' password='postgres'")
cur = conn.cursor()
cur.execute("SELECT chave, receita_vivo FROM importador.regras_receita LIMIT 10")
data = cur.fetchall()

with open('debug_chave.json', 'w', encoding='utf-8') as f:
    json.dump([{'chave': r[0], 'receita': str(r[1])} for r in data], f, indent=2, ensure_ascii=False)
