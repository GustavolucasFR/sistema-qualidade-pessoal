import psycopg2
import pandas as pd

conn = psycopg2.connect("dbname='postgres' user='postgres' host='localhost' password='postgres'")
cur = conn.cursor()
cur.execute("SELECT status, data_agendada_para_execu__o FROM importador.zeus_consolidado WHERE n_mero_da_ordem_de_servi_o = '7671334842:76905976'")
print("DB:", cur.fetchall())

df = pd.read_excel(r'C:\Users\TECNOMULTI\sistema-qualidade\dados\2_dados_consolidados\ProducaoBA.xlsb', engine='pyxlsb', sheet_name='Zeus')
os_col = [c for c in df.columns if 'Ordem de Servi' in c][0]
date_col = [col for col in df.columns if 'Data Agendada' in col][0]
print("Excel:\n", df[df[os_col] == '7671334842:76905976'][['Status', date_col]])
