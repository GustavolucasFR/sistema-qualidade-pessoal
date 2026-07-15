import pandas as pd

file_path = 'c:/Users/TECNOMULTI/sistema-qualidade/dados/2_dados_consolidados/06_Base_Zeus_Jul_26.xlsx'
df = pd.read_excel(file_path, header=None, nrows=20)
header_idx = 0
for idx, row in df.iterrows():
    row_str = ' '.join([str(v).lower() for v in row.values])
    if 'tecnicos' in row_str and 'status' in row_str and 'cidade' in row_str:
        header_idx = idx
        break

print(f"Header at row: {header_idx}")
df = pd.read_excel(file_path, header=header_idx)

# Find row with login_tecnico 81077674
import sys
cols_to_print = [c for c in df.columns if 'empresa' in str(c).lower() or 'tecnic' in str(c).lower() or 'data' in str(c).lower()]
print("Columns:", cols_to_print)

sample = df[df.iloc[:, 0].astype(str).str.contains('81077674|G0024160', na=False)]
if not sample.empty:
    print(sample[cols_to_print].head(5))
else:
    print("Not found by first column. Let's try searching all columns.")
    for col in df.columns:
        sample = df[df[col].astype(str).str.contains('81077674|G0024160', na=False)]
        if not sample.empty:
            print(f"Found in column {col}:")
            print(sample[cols_to_print].head(5))
            break
