import win32com.client
import os
import json
import glob

excel = win32com.client.Dispatch("Excel.Application")
excel.Visible = False

try:
    search_path = r"C:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos\Produ*BA_12072026.xlsb"
    files = glob.glob(search_path)
    if not files:
        print("File not found")
        exit()
    file_path = files[0]
    
    wb = excel.Workbooks.Open(file_path, ReadOnly=True)
    ws = wb.Sheets("Extra")
    
    data = []
    # Read rows from 1 to 500, cols A to Z
    for row in range(1, 500):
        row_data = []
        for col in range(1, 27): # A to Z
            cell = ws.Cells(row, col)
            val = cell.Value
            formula = cell.Formula
            if formula and str(formula).startswith('='):
                row_data.append(f"[{formula}] ({val})")
            else:
                row_data.append(str(val) if val is not None else "")
        if any(row_data):
            data.append(row_data)
            
    with open("extra_formulas_full.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Done", len(data))
finally:
    try:
        wb.Close(False)
    except:
        pass
    excel.Quit()
