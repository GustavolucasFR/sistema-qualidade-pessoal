import os
import time
import sys
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager

# Carregar credenciais
env_path = os.path.join(os.path.dirname(__file__), ".env.elos")
load_dotenv(env_path)
ELOS_LOGIN = os.getenv("ELOS_LOGIN")
ELOS_SENHA = os.getenv("ELOS_SENHA")

if not ELOS_LOGIN or not ELOS_SENHA or ELOS_LOGIN == "SuaMatriculaAqui":
    print("[ERRO] Por favor, configure suas credenciais no arquivo analytics/.env.elos")
    sys.exit(1)

DOWNLOAD_DIR = r"C:\Users\TECNOMULTI\Downloads"

def wait_and_click(driver, xpath, timeout=20, name=""):
    try:
        if name: print(f"  -> Tentando clicar em: {name}")
        element = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, xpath))
        )
        # Scroll to element to avoid interception
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        time.sleep(0.5)
        # Forca o clique via javascript para evitar bloqueios de tela
        driver.execute_script("arguments[0].click();", element)
    except Exception as e:
        print(f"  [X] Falha ao tentar clicar em: {name} (XPath: {xpath})")
        raise e

def main():
    print("Iniciando Robo ELOS Dashboard...")
    
    options = Options()
    # options.add_argument('--headless') # Comentado para voce ver a magica acontecer
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_experimental_option("prefs", {
        "download.default_directory": DOWNLOAD_DIR,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True
    })
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    
    try:
        # 1. Login
        print("Acessando a tela de Login...")
        driver.get("http://10.31.36.30/Elos.Dashboard/BacklogDiario")
        
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "cboEmail")))
        driver.find_element(By.ID, "cboEmail").send_keys(ELOS_LOGIN)
        
        senha_field = driver.find_element(By.ID, "cboSenha")
        senha_field.send_keys(ELOS_SENHA)
        
        # Pressiona ENTER no campo de senha para fazer login (mais seguro do que procurar o botao)
        senha_field.send_keys(Keys.RETURN)
        
        print("Login efetuado. Aguardando carregamento...")
        time.sleep(5) # Aguarda redirects iniciais
        
        # 2. Tela de Atualizacao de Cadastro (Pular)
        try:
            print("Verificando tela de Atualização de Cadastro...")
            btn_pular = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Pular')] | //a[contains(text(), 'Pular')]"))
            )
            print("Clicando em Pular...")
            driver.execute_script("arguments[0].click();", btn_pular)
            time.sleep(3)
        except:
            print("Tela de atualização não apareceu, seguindo...")
            
        # 3. Tela Inicial (Ir para Dashboards)
        print("Entrando no Portal de Dashboards (Redirecionamento)...")
        driver.get("http://10.31.36.30/Elos/Home/ElosPortaisRedirect/25")
        time.sleep(5)
            
        # 4. Tela do Backlog
        print("Acessando a página de filtros do Backlog...")
        driver.get("http://10.31.36.30/Elos.Dashboard/BacklogDiario")
        print("Carregando o painel de filtros (isso pode demorar um pouco)...")
        time.sleep(15) # O Dashboard é pesado, damos 15 segundos para renderizar tudo
        
        print("Preenchendo Filtros...")
        
        # Tipo de Servico: Reparos (Radio Button)
        wait_and_click(driver, "//label[contains(text(), 'Reparos')] | //span[contains(text(), 'Reparos')]", name="Filtro: Reparos")
        
        # Origem: VIVO (Radio Button)
        wait_and_click(driver, "//label[normalize-space()='VIVO'] | //span[normalize-space()='VIVO']", name="Filtro: VIVO")
        
        # Escritorio de Servico: Todos (ja vem marcado no print, mas garantindo)
        try:
            wait_and_click(driver, "//label[contains(text(), 'Escritório de Serviço')]/..//label[contains(text(), 'Todos')]", timeout=3, name="Filtro: Todos (Escritório)")
        except:
            pass

        # Regional: NORDESTE
        wait_and_click(driver, "//label[contains(text(), 'NORDESTE')] | //span[contains(text(), 'NORDESTE')]", name="Filtro: Regional NORDESTE")
        
        print("Aguardando Clusters carregarem...")
        time.sleep(4) # Importante: o site demora para carregar os clusters apos escolher a regional
        
        # Cluster: (Desmarcar todos primeiro, depois marcar os 4)
        print("Selecionando Clusters...")
        try:
            wait_and_click(driver, "//h5[contains(text(), 'Cluster')]/..//label[contains(text(), 'Desmarcar todos')] | //label[contains(text(), 'Cluster')]/..//input[@title='Desmarcar todos']", timeout=3, name="Desmarcar Clusters")
        except:
            pass # Se nao tiver desmarcar todos, ignora
            
        clusters = ['CARUARU', 'JOAO PESSOA', 'NATAL', 'RECIFE']
        for cluster in clusters:
            wait_and_click(driver, f"//label[contains(., '{cluster}')] | //span[contains(., '{cluster}')]", name=f"Cluster: {cluster}")
            time.sleep(2) # Espera o site processar o clique para não encavalar
            
        print("Aguardando Cidades carregarem completamente...")
        time.sleep(4) # Importante: aguarda as cidades aparecerem

        # Cidade: Marcar todas
        print("Marcando todas as Cidades...")
        try:
            xpath_marcar_todas_cidades = "//*[normalize-space(text())='Cidade']/following::label[contains(., 'Marcar todos')][1] | //*[contains(text(), 'Cidade')]/following::label[contains(., 'Marcar todos')][1]"
            wait_and_click(driver, xpath_marcar_todas_cidades, name="Marcar todas as Cidades", timeout=5)
            time.sleep(1)
        except:
            print("Não encontrou o botão Marcar todos das Cidades. Ignorando...")
                
        # Exportar dados
        print("Gerando o arquivo (Exportar dados)...")
        wait_and_click(driver, "//button[contains(text(), 'Exportar dados')] | //a[contains(text(), 'Exportar dados')]", name="Botão Exportar")
        
        # Aguardar o arquivo baixar na pasta Downloads (BacklogDiario*.csv)
        print("Aguardando o download concluir (o servidor pode demorar uns 30s pra gerar o arquivo)...")
        baixado = False
        tempo_limite = 120 # 2 minutos de tolerancia
        inicio = time.time()
        
        while time.time() - inicio < tempo_limite:
            arquivos = [f for f in os.listdir(DOWNLOAD_DIR) if "BackLogDiario" in f and f.endswith(".csv")]
            # Pega o arquivo mais recente
            if arquivos:
                # Ordena para pegar o modificado mais recentemente
                arquivos.sort(key=lambda x: os.path.getmtime(os.path.join(DOWNLOAD_DIR, x)), reverse=True)
                caminho = os.path.join(DOWNLOAD_DIR, arquivos[0])
                
                # Checa se terminou de baixar (tamanho maior que 0 e arquivo nao tem .crdownload)
                if os.path.getsize(caminho) > 0:
                    baixado = True
                    print(f"Download detectado com sucesso: {arquivos[0]}")
                    # Da um tempo extra pro sistema operacional fechar o handle do arquivo
                    time.sleep(3)
                    break
            time.sleep(3)
            
        if not baixado:
            print("[ERRO] O download falhou ou demorou mais de 2 minutos.")
            
    except Exception as e:
        print(f"\n[ERRO NO ROBO] Ele parou porque não encontrou um elemento na tela.")
        print(f"Erro original: {e}")
        print("Deixando o navegador aberto por 2 minutos para voce visualizar onde ele parou...")
        time.sleep(120)
    finally:
        print("Fechando navegador...")
        driver.quit()

if __name__ == "__main__":
    main()
