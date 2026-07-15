import win32com.client
import os
import json

excel = win32com.client.Dispatch("Excel.Application")
excel.Visible = False

try:
    file_path = r"C:\Users\TECNOMULTI\sistema-qualidade\backend\uploads\ProduçãoBA_12072026.xlsb"
    wb = excel.Workbooks.Open(file_path, ReadOnly=True)
    ws = wb.Sheets("Extra")
    
    data = []
    # Read rows from 1 to 50, cols A to Z
    for row in range(1, 51):
        row_data = []
        for col in range(1, 27): # A to Z
            cell = ws.Cells(row, col)
            val = cell.Value
            formula = cell.Formula
            if formula and formula.startswith('='):
                row_data.append(f"[{formula}] ({val})")
            else:
                row_data.append(str(val) if val is not None else "")
        # Only add row if not completely empty
        if any(row_data):
            data.append(row_data)
            
    with open("extra_formulas.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

finally:
    wb.Close(False)
    excel.Quit()
