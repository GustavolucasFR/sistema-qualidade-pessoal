import os
import glob
import shutil
import subprocess
import sys

downloads_dir = r"C:\Users\TECNOMULTI\Downloads"
dest_dir = r"C:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos"
import_backlog_script = r"C:\Users\TECNOMULTI\sistema-qualidade\analytics\import_only_backlog.py"
import_producao_script = r"C:\Users\TECNOMULTI\sistema-qualidade\analytics\importar_producao_ba.py"
robo_elos_script = r"C:\Users\TECNOMULTI\sistema-qualidade\analytics\robo_elos.py"

print("="*50)
print("  ROBÔ ELOS & ATUALIZADOR AUTOMÁTICO  ")
print("="*50)

print("\n[*] Iniciando o Robô do Selenium para baixar o Backlog Diário do portal ELOS...")
# try:
#     resultado_robo = subprocess.run([sys.executable, robo_elos_script])
#     if resultado_robo.returncode != 0:
#         print("[AVISO] O Robô retornou um erro ou você não configurou as senhas ainda.")
#         print("Continuando a importação com os arquivos que já estão na pasta Downloads...\n")
# except Exception as e:
#     print(f"[ERRO] Falha ao executar o robô: {e}")

def puxar_e_importar(pattern, dest_name, script_path, nome_amigavel):
    search_pattern = os.path.join(downloads_dir, pattern)
    files = glob.glob(search_pattern)
    
    if not files:
        print(f"\n[-] Nenhum arquivo '{pattern}' encontrado na pasta Downloads.")
        return False
        
    latest_file = max(files, key=os.path.getctime)
    print(f"\n[+] Arquivo {nome_amigavel} encontrado: {os.path.basename(latest_file)}")
    
    dest_file = os.path.join(dest_dir, dest_name)
    print(f"[*] Copiando para a pasta do sistema...")
    shutil.copy2(latest_file, dest_file)
    
    print(f"[*] Iniciando a importacao de {nome_amigavel} no banco de dados...")
    try:
        subprocess.run([sys.executable, script_path], check=True)
        print(f"[OK] {nome_amigavel} importado com sucesso!")
        return True
    except subprocess.CalledProcessError:
        print(f"[ERRO] Falha ao importar {nome_amigavel}.")
        return False

# Puxar Backlog
puxar_e_importar("BackLogDiario*.csv", "BackLogDiario.csv", import_backlog_script, "Backlog Diario")

# Puxar ProducaoBA (Você pode baixar manualmente todo dia ou fazemos um robô pra ele depois)
puxar_e_importar("ProduçãoBA*.xlsb", "ProducaoBA.xlsb", import_producao_script, "Producao BA")

print("\n" + "="*50)
print("      ATUALIZACAO CONCLUIDA!      ")
print("="*50)
print("\nPode ir la no painel e dar um F5!")

input("\nPressione ENTER para fechar essa janela...")
