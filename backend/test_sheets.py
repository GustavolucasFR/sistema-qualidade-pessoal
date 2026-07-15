from pyxlsb import open_workbook
with open_workbook('C:/Users/TECNOMULTI/sistema-qualidade/dados/1_uploads_brutos/ProduçãoBA_12072026.xlsb') as wb:
    print(wb.sheets)
