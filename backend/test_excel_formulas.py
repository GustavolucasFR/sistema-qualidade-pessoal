import win32com.client
import os

excel = win32com.client.Dispatch("Excel.Application")
excel.Visible = False

workbook = excel.Workbooks.Open(r"C:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos\ProduçãoBA_12072026.xlsb")
sheet = workbook.Sheets("Extra")

print("Formulas in Extra sheet:")
# Check row 2 (first data row) for formulas
for col in range(1, 62):
    cell = sheet.Cells(2, col)
    if cell.HasFormula:
        print(f"Col {col} ({sheet.Cells(1, col).Value}): {cell.Formula}")

workbook.Close(False)
excel.Quit()
