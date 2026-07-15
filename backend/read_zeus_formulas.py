import os
import win32com.client as win32

file_path = r'c:\Users\TECNOMULTI\sistema-qualidade\dados\2_dados_consolidados\ProducaoBA.xlsb'

try:
    excel = win32.Dispatch('Excel.Application')
    excel.Visible = False
    
    workbook = excel.Workbooks.Open(file_path, ReadOnly=True)
    sheet = workbook.Sheets('Zeus')
    
    # We want to find the first row of data, say row 2
    # and print the formulas for all columns in row 2
    used_cols = sheet.UsedRange.Columns.Count
    print("Columns in Zeus:")
    
    headers = []
    for c in range(1, used_cols + 1):
        headers.append(sheet.Cells(1, c).Value)
        
    for c in range(1, used_cols + 1):
        cell = sheet.Cells(2, c)
        val = cell.Value
        formula = cell.Formula
        if formula and str(formula).startswith('='):
            print(f"Col {c} ({headers[c-1]}): {formula}")
            
    workbook.Close(False)
    excel.Quit()
    print("Done")
except Exception as e:
    print("Error:", e)
    try:
        excel.Quit()
    except:
        pass
