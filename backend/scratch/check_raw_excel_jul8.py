import pandas as pd
import sys

file_path = 'c:/Users/TECNOMULTI/sistema-qualidade/dados/2_dados_consolidados/06_Base_Zeus_Jul_26.xlsx'
df_temp = pd.read_excel(file_path, header=None, nrows=20, dtype=str)
header_idx = 0
for idx, row in df_temp.iterrows():
    row_str = ' '.join([str(v).lower() for v in row.values])
    if 'tecnicos' in row_str and 'status' in row_str and 'cidade' in row_str:
        header_idx = idx
        break

df = pd.read_excel(file_path, header=header_idx, dtype=str)

df['Data Agendada para Execuo'] = pd.to_datetime(pd.to_numeric(df['Data Agendada para Execuo'], errors='coerce'), origin='1899-12-30', unit='D').combine_first(pd.to_datetime(df['Data Agendada para Execuo'], errors='coerce'))

df_jul8 = df[df['Data Agendada para Execuo'].dt.date.astype(str) == '2026-07-08']
print(f"Total rows on July 8: {len(df_jul8)}")

tec_cols = [c for c in df.columns if 'tec' in str(c).lower()]
emp_cols = [c for c in df.columns if 'empresa' in str(c).lower()]

print(f"Tecnologia columns: {tec_cols}")
print(f"Empresa columns: {emp_cols}")

if len(df_jul8) > 0:
    for col in tec_cols + emp_cols:
        null_count = df_jul8[col].isna().sum() + (df_jul8[col] == 'nan').sum()
        print(f"Column '{col}' has {null_count} nulls out of {len(df_jul8)} on July 8.")

