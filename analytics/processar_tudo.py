import os
import subprocess
import sys
import time
from sqlalchemy import create_engine, text

def obter_tabelas_mensais(engine):
    query = """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'importador' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('hash_registros', 'controle_importacao', 'logs', 'erros', 'colunas_adicionadas', 'historico_colunas', 'log_erros_importacao', 'log_alteracoes', 'base_de_técnicos', 'resultado_penalizacoes', 'resultado_financeiro', 'resultado_kpis', 'resultados_slas', 'resultados_irr')
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        return [row[0] for row in result]

def limpar_tabelas_resultados(engine):
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(text("DROP TABLE IF EXISTS importador.resultado_penalizacoes"))
            conn.execute(text("DROP TABLE IF EXISTS importador.resultado_financeiro"))
            conn.execute(text("DROP TABLE IF EXISTS importador.resultado_kpis"))
            conn.execute(text("DROP TABLE IF EXISTS importador.resultados_slas"))
            conn.execute(text("DROP TABLE IF EXISTS importador.resultados_irr"))

def processar():
    print("Iniciando importação de arquivos brutos (Excel)...")
    script_importacao = os.path.join(os.path.dirname(__file__), 'importar_excel.py')
    script_efetividade = os.path.join(os.path.dirname(__file__), 'importar_efetividade.py')
    script_base_tecnicos = os.path.join(os.path.dirname(__file__), 'build_base_tecnicos.py')
    script_grelha = os.path.join(os.path.dirname(__file__), 'importar_grelha.py')
    
    try:
        print("[1/4] Importando Base Principal (Baremo)...")
        subprocess.run([sys.executable, script_importacao], check=True)
        print("[2/4] Importando Base de Efetividade...")
        subprocess.run([sys.executable, script_efetividade], check=True)
        print("[3/4] Construindo Base de Técnicos (Matrícula -> Nome)...")
        subprocess.run([sys.executable, script_base_tecnicos], check=True)
        print("[4/4] Importando Grelha Oficial de Remuneração...")
        subprocess.run([sys.executable, script_grelha], check=True)
    except Exception as e:
        print(f"Erro na importação de arquivos excel: {e}")

    print("Iniciando processamento no banco de dados...")
    try:
        engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
        tabelas = obter_tabelas_mensais(engine)
        
        if not tabelas:
            print("Nenhuma tabela mensal encontrada para processar.")
            return

        limpar_tabelas_resultados(engine)

        script_regras = os.path.join(os.path.dirname(__file__), 'motor_regras.py')
        script_anexo07 = os.path.join(os.path.dirname(__file__), 'motor_anexo07.py')
        script_slas = os.path.join(os.path.dirname(__file__), 'motor_slas_pg.py')
        script_irr = os.path.join(os.path.dirname(__file__), 'motor_irr_pg.py')

        for tabela in tabelas:
            print(f"\n--- Processando tabela: {tabela} ---")
            # Executar regras operacionais
            subprocess.run([sys.executable, script_regras, tabela, 'telefonica_anexo09'])
            # Executar regras financeiras
            subprocess.run([sys.executable, script_anexo07, tabela])
            # Executar Auditoria de SLAs
            subprocess.run([sys.executable, script_slas, tabela])
            # Executar Auditoria de Reincidência (IRR)
            subprocess.run([sys.executable, script_irr, tabela])
            
        print("\nProcessamento concluído com sucesso!")
    except Exception as e:
        print(f"Erro ao processar: {e}")

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Pipeline Mestre ETL")
    parser.add_argument('--once', action='store_true', help='Executa apenas uma vez sem loop infinito')
    args = parser.parse_args()

    # Executa a primeira vez
    processar()
    
    if args.once:
        print("\n[✓] Pipeline concluído com sucesso (modo once).")
        return

    # Loop para rodar a cada 30 minutos
    while True:
        print("\nAguardando 30 minutos (1800 segundos) para o próximo processamento...")
        time.sleep(1800)
        processar()

if __name__ == "__main__":
    main()
