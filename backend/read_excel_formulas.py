import os
import win32com.client as win32

file_path = r'C:\Users\TECNOMULTI\sistema-qualidade\dados\2_dados_consolidados\ProducaoBA.xlsb'
if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit()

try:
    excel = win32.Dispatch('Excel.Application')
    excel.Visible = False
    
    workbook = excel.Workbooks.Open(file_path, ReadOnly=True)
    sheet = workbook.Sheets('Extra')
    
    used_range = sheet.UsedRange
    
    # We only care about columns that contain formulas, or just print everything
    print(f"Sheet 'Extra' has {used_range.Rows.Count} rows and {used_range.Columns.Count} columns.")
    
    print("--- FIRST 5 ROWS WITH FORMULAS ---")
    
    for r in range(1, min(used_range.Rows.Count, 5) + 1):
        row_data = []
        for c in range(1, used_range.Columns.Count + 1):
            cell = sheet.Cells(r, c)
            val = cell.Value
            formula = cell.Formula
            if formula and formula.startswith('='):
                row_data.append(f"[{c}] Formula: {formula}")
            else:
                row_data.append(f"[{c}] Val: {val}")
        print(f"Row {r}: " + " | ".join(row_data))
        
    workbook.Close(False)
    excel.Quit()
    print("Done")
except Exception as e:
    print("Error:", e)
    try:
        excel.Quit()
    except:
        pass
