import pandas as pd
df = pd.read_excel(r'C:\Users\TECNOMULTI\sistema-qualidade\dados\2_dados_consolidados\ProducaoBA.xlsb', sheet_name='Extra', engine='pyxlsb')
print("Total rows:", len(df))
# Let's count how many unique "Detalhe de Atividade" there are
print("Unique Detalhe de Atividade:", df['Detalhe de Atividade'].nunique())
print("Unique ATIVIDADE:", df['ATIVIDADE'].nunique())

df_subset = df[['Detalhe de Atividade', 'ATIVIDADE', 'Estado', 'Tecnologia', 'Reaproveitamento de DROP']].drop_duplicates()
print("Number of unique mappings:", len(df_subset))
