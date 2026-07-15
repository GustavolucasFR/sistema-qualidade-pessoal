import win32com.client
import glob

excel = win32com.client.Dispatch("Excel.Application")
excel.Visible = False

try:
    search_path = r"C:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos\Produ*BA_12072026.xlsb"
    files = glob.glob(search_path)
    file_path = files[0]
    
    wb = excel.Workbooks.Open(file_path, ReadOnly=True)
    sheets = [s.Name for s in wb.Sheets]
    print(sheets)
finally:
    try:
        wb.Close(False)
    except:
        pass
    excel.Quit()
