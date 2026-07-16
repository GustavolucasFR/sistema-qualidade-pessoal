import time
import os
import subprocess
import sys
import glob

WATCH_DIR = r"C:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos"
CONSOLIDADO_DIR = r"C:\Users\TECNOMULTI\sistema-qualidade\dados\2_dados_consolidados"
DOWNLOADS_DIR = r"C:\Users\TECNOMULTI\Downloads"
SCRIPT_BACKLOG = r"C:\Users\TECNOMULTI\sistema-qualidade\analytics\import_only_backlog.py"
SCRIPT_ZEUS = r"C:\Users\TECNOMULTI\sistema-qualidade\analytics\import_zeus.py"
SCRIPT_ZEUS_MOTOR = r"C:\Users\TECNOMULTI\sistema-qualidade\analytics\motor_zeus_produtividade.py"
SCRIPT_BA = r"C:\Users\TECNOMULTI\sistema-qualidade\backend\import_planilha_ba.py"

def get_mtime(filepath):
    try:
        return os.path.getmtime(filepath)
    except OSError:
        return None

def get_latest_file():
    files_backlog = glob.glob(os.path.join(WATCH_DIR, "BackLogDiario*.csv")) + glob.glob(os.path.join(DOWNLOADS_DIR, "BackLogDiario*.csv"))
    files_zeus = glob.glob(os.path.join(WATCH_DIR, "*Zeus*.xlsx")) + glob.glob(os.path.join(DOWNLOADS_DIR, "*Zeus*.xlsx"))
    
    files_ba = []
    for d in [CONSOLIDADO_DIR, WATCH_DIR, DOWNLOADS_DIR]:
        files_ba.extend(glob.glob(os.path.join(d, "*ProducaoBA*.xlsb")))
        files_ba.extend(glob.glob(os.path.join(d, "*ProduçãoBA*.xlsb")))
        files_ba.extend(glob.glob(os.path.join(d, "*Producao BA*.xlsb")))
        
    files = files_backlog + files_zeus + files_ba
    files = [f for f in files if not os.path.basename(f).startswith('~$')]
    
    if not files:
        return None, None
    latest_file = max(files, key=get_mtime)
    return latest_file, get_mtime(latest_file)

def main():
    print("="*60)
    print(" 🚀 MONITOR DE UPLOADS AUTOMÁTICO (A CADA 20 SEGUNDOS) 🚀")
    print("="*60)
    print(f"[*] Monitorando as pastas:\n    {WATCH_DIR}\n    {CONSOLIDADO_DIR}\n    {DOWNLOADS_DIR}\n")
    print("[*] Deixe esta janela aberta. O sistema atualizará sozinho!")
    
    latest_file, last_mtime = None, None

    while True:
        current_file, current_mtime = get_latest_file()
        
        # Se encontrou algum arquivo
        if current_mtime is not None:
            # Se não existia arquivo antes, ou o arquivo mudou, ou foi modificado
            if last_mtime is None or latest_file != current_file or current_mtime > last_mtime:
                filename_only = os.path.basename(current_file)
                print(f"\n[{time.strftime('%H:%M:%S')}] 🚨 Novo arquivo detectado: {filename_only}")
                
                script_to_run = None
                filename_lower = filename_only.lower()
                if "backlogdiario" in filename_lower:
                    script_to_run = SCRIPT_BACKLOG
                elif "zeus" in filename_lower:
                    script_to_run = SCRIPT_ZEUS
                elif "producaoba" in filename_lower or "produçãoba" in filename_lower or "producao ba" in filename_lower:
                    script_to_run = SCRIPT_BA
                
                if script_to_run:
                    print(f"[{time.strftime('%H:%M:%S')}] Iniciando a importação para o banco de dados...")
                    try:
                        subprocess.run([sys.executable, script_to_run], check=True)
                        print(f"[{time.strftime('%H:%M:%S')}] ✅ Importação concluída com sucesso!")
                        
                        if script_to_run == SCRIPT_ZEUS:
                            print(f"[{time.strftime('%H:%M:%S')}] Iniciando recálculo de SLAs e Produtividade (Motor Zeus)...")
                            subprocess.run([sys.executable, SCRIPT_ZEUS_MOTOR], check=True)
                            print(f"[{time.strftime('%H:%M:%S')}] ✅ Cálculos do Motor Zeus finalizados!")
                            
                    except subprocess.CalledProcessError:
                        print(f"[{time.strftime('%H:%M:%S')}] ❌ Erro durante a importação do arquivo.")
                
                # Atualiza as referências
                last_mtime = current_mtime
                latest_file = current_file

        # Espera 20 segundos
        time.sleep(20)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nMonitoramento encerrado pelo usuário.")
