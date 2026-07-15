import pandas as pd
df = pd.read_excel(r'C:\Users\TECNOMULTI\sistema-qualidade\dados\2_dados_consolidados\ProducaoBA.xlsb', sheet_name='Extra', engine='pyxlsb')
print(df.columns.tolist())
