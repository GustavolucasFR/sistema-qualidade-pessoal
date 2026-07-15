import os
import time
import shutil
import subprocess
from datetime import datetime

# Pastas Principais
DESKTOP_DIR = os.path.join(os.path.expanduser("~"), "Desktop")
HOT_FOLDER = os.path.join(DESKTOP_DIR, "Entrada_de_Dados")
PROCESSED_FOLDER = os.path.join(HOT_FOLDER, "Processados")

# Pasta interna do sistema onde os scripts esperam encontrar os arquivos
INTERNAL_UPLOADS = r"c:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos"

# Caminho dos scripts
ANALYTICS_DIR = r"c:\Users\TECNOMULTI\sistema-qualidade\analytics"

def setup_folders():
    os.makedirs(HOT_FOLDER, exist_ok=True)
    os.makedirs(PROCESSED_FOLDER, exist_ok=True)
    os.makedirs(INTERNAL_UPLOADS, exist_ok=True)
    print(f"[*] Monitorando a pasta: {HOT_FOLDER}")

def processar_arquivo(caminho_arquivo, nome_arquivo):
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Novo arquivo detectado: {nome_arquivo}")
    nome_lower = nome_arquivo.lower()
    sucesso = False
    
    try:
        if "backlog" in nome_lower and nome_lower.endswith(".csv"):
            print("  -> Identificado como: BACKLOG")
            destino_interno = os.path.join(INTERNAL_UPLOADS, "BackLogDiario.csv")
            shutil.copy2(caminho_arquivo, destino_interno)
            
            # Chama o script do backlog
            resultado = subprocess.run(["python", "import_only_backlog.py"], cwd=ANALYTICS_DIR, capture_output=True, text=True)
            if resultado.returncode == 0:
                print("  -> Importação do Backlog concluída com sucesso!")
                sucesso = True
            else:
                print(f"  [ERRO] Falha ao importar Backlog:\n{resultado.stderr}")
                
        elif "producao" in nome_lower and (nome_lower.endswith(".xlsx") or nome_lower.endswith(".xls")):
            print("  -> Identificado como: PRODUÇÃO BA")
            destino_interno = os.path.join(INTERNAL_UPLOADS, "ProducaoBA.xlsx")
            shutil.copy2(caminho_arquivo, destino_interno)
            
            resultado = subprocess.run(["python", "importar_excel.py"], cwd=ANALYTICS_DIR, capture_output=True, text=True)
            if resultado.returncode == 0:
                print("  -> Importação de Produção concluída com sucesso!")
                sucesso = True
            else:
                print(f"  [ERRO] Falha ao importar Produção:\n{resultado.stderr}")
                
        elif "efetividade" in nome_lower or "t-dna" in nome_lower or "tdna" in nome_lower:
            print("  -> Identificado como: EFETIVIDADE / T-DNA")
            if "t-dna" in nome_lower or "tdna" in nome_lower:
                destino_interno = os.path.join(INTERNAL_UPLOADS, "T-DNA.xlsx")
            else:
                destino_interno = os.path.join(INTERNAL_UPLOADS, "Efetividade.xlsx")
            shutil.copy2(caminho_arquivo, destino_interno)
            
            resultado = subprocess.run(["python", "importar_efetividade.py"], cwd=ANALYTICS_DIR, capture_output=True, text=True)
            if resultado.returncode == 0:
                print("  -> Importação de Efetividade concluída com sucesso!")
                sucesso = True
            else:
                print(f"  [ERRO] Falha ao importar Efetividade:\n{resultado.stderr}")
                
        else:
            print("  [AVISO] Arquivo ignorado (Nome não reconhecido ou extensão inválida).")
            return

        # Move para processados se deu sucesso
        if sucesso:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            nome_novo = f"{os.path.splitext(nome_arquivo)[0]}_{timestamp}{os.path.splitext(nome_arquivo)[1]}"
            caminho_processado = os.path.join(PROCESSED_FOLDER, nome_novo)
            
            # Tenta mover (com retries caso esteja preso por outro processo)
            for _ in range(3):
                try:
                    shutil.move(caminho_arquivo, caminho_processado)
                    print(f"  -> Arquivo movido para Processados: {nome_novo}")
                    break
                except PermissionError:
                    time.sleep(2)
            
    except Exception as e:
        print(f"  [ERRO GRAVE] {e}")

def watch_loop():
    setup_folders()
    while True:
        try:
            # Lista todos os arquivos na raiz do Hot Folder (ignora a pasta Processados)
            arquivos = [f for f in os.listdir(HOT_FOLDER) if os.path.isfile(os.path.join(HOT_FOLDER, f))]
            
            # Filtra ignorando arquivos ocultos e temporarios de download (.crdownload, .tmp)
            arquivos_validos = [f for f in arquivos if not f.startswith(".") and not f.endswith(".crdownload") and not f.endswith(".tmp")]
            
            for arquivo in arquivos_validos:
                caminho_completo = os.path.join(HOT_FOLDER, arquivo)
                
                # Só processa se o arquivo não estiver sendo escrito (verifica se consegue abrir e fechar)
                try:
                    os.rename(caminho_completo, caminho_completo)
                    processar_arquivo(caminho_completo, arquivo)
                except PermissionError:
                    # Arquivo está bloqueado (provavelmente ainda baixando/copiando)
                    pass
                    
        except Exception as e:
            print(f"[ERRO NO LOOP] {e}")
            
        time.sleep(120) # Aguarda 2 minutos

if __name__ == "__main__":
    print("==========================================")
    print("   OBSERVADOR DE PASTAS (HOT FOLDER)")
    print("==========================================")
    watch_loop()
