import pandas as pd
from sqlalchemy import create_engine
import os
import sys

def calcular_produtividade():
    print("============================================================")
    print(" INICIANDO CÁLCULO DE PRODUTIVIDADE (ZEUS) ")
    print("============================================================")
    
    engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
    
    # 1. Carregar a base do Zeus consolidada
    print("[1/4] Carregando dados brutos do Zeus...")
    query_zeus = """
        SELECT 
            tecnicos AS tecnico,
            cidade,
            zona_de_trabalho AS cluster,
            tipo_de_atividade,
            status,
            data_agendada_para_execu__o AS data_execucao,
            dura__o AS tempo_execucao,
            tempo_de_deslocamento
        FROM importador.zeus_consolidado
        WHERE tecnicos IS NOT NULL AND tecnicos != 'nan'
    """
    df_zeus = pd.read_sql(query_zeus, engine)
    
    if df_zeus.empty:
        print("[ERRO] Nenhum dado encontrado na tabela zeus_consolidado.")
        sys.exit(1)
        
    print(f"      -> {len(df_zeus)} registros carregados.")
    
    # 2. Carregar a tabela de pesos nova (Peso PU.xlsx)
    pesos_path = r"c:\Users\TECNOMULTI\sistema-qualidade\dados\dicionarios\Peso PU.xlsx"
    if not os.path.exists(pesos_path):
        print(f"[ERRO] O arquivo {pesos_path} não foi encontrado. Coloque o arquivo na pasta de dicionarios.")
        sys.exit(1)
        
    print("[2/4] Carregando tabela de Pesos e SLA...")
    df_pesos = pd.read_excel(pesos_path, engine='openpyxl')
    
    # Padronizar nomes das colunas
    df_pesos.columns = [str(c).strip().lower() for c in df_pesos.columns]
    
    col_atividade = 'atividade' if 'atividade' in df_pesos.columns else df_pesos.columns[0]
    col_pu = 'peso' if 'peso' in df_pesos.columns else df_pesos.columns[1]
    col_sla = 'sla' if 'sla' in df_pesos.columns else df_pesos.columns[2]
    
    df_pesos['chave_join'] = df_pesos[col_atividade].astype(str).str.strip().str.upper()
    df_pesos_unico = df_pesos.drop_duplicates(subset=['chave_join']).copy()
    
    dict_pesos = df_pesos_unico.set_index('chave_join')[[col_pu, col_sla]].to_dict('index')
    
    # 3. Processar e Calcular as Métricas
    print("[3/4] Calculando PU, SLA e Efetividade...")
    
    def format_sla(sla_val):
        if pd.isna(sla_val): return '00:00:00'
        return str(sla_val)

    # Função para buscar PU e SLA com base no tipo_de_atividade
    def get_pu_sla(atividade):
        if pd.isna(atividade): return 0.0, '00:00:00'
        chave = str(atividade).strip().upper()
        val = dict_pesos.get(chave)
        if val:
            try:
                pu = float(val[col_pu])
            except:
                pu = 0.0
            sla = format_sla(val[col_sla])
            return pu, sla
        return 0.0, '00:00:00'
    
    # Aplicar os cálculos
    pu_sla_series = df_zeus['tipo_de_atividade'].apply(get_pu_sla)
    df_zeus['pontos_unitarios'] = [x[0] for x in pu_sla_series]
    df_zeus['pontuacao_baremo'] = df_zeus['pontos_unitarios']
    df_zeus['sla_alvo'] = [x[1] for x in pu_sla_series]
    
    # Efetividade (Apenas se status for "Concluída")
    df_zeus['efetividade_tecnico'] = df_zeus['status'].apply(
        lambda x: 100.0 if str(x).strip().upper() in ['CONCLUÍDA', 'CONCLUDA', 'COMPLETA'] else 0.0
    )
    
    # Tratar a data
    df_zeus['competencia'] = pd.to_datetime(df_zeus['data_execucao'], errors='coerce').dt.strftime('%b/%Y')
    
    # 4. Salvar na tabela final (Vamos salvar em importador.resultados_sla_zeus para não quebrar o dashboard atual até virarmos a chave)
    print("[4/4] Salvando resultados no banco de dados...")
    
    # O dashboard antigo lê as colunas: competencia, tecnico, cidade, cluster, pontos_unitarios, pontuacao_baremo, efetividade_tecnico, data_execucao
    # Mas como o BD original n tinha cluster na SLA, vamos garantir que a nossa tenha
    
    cols_to_save = ['competencia', 'tecnico', 'cidade', 'cluster', 'tipo_de_atividade', 'status', 'data_execucao', 'pontos_unitarios', 'pontuacao_baremo', 'efetividade_tecnico', 'tempo_execucao', 'tempo_de_deslocamento', 'sla_alvo']
    df_final = df_zeus[cols_to_save].copy()
    
    # Converter para os tipos corretos para que o banco de dados possa somar e usar datas
    df_final['pontos_unitarios'] = pd.to_numeric(df_final['pontos_unitarios'], errors='coerce').fillna(0)
    df_final['pontuacao_baremo'] = pd.to_numeric(df_final['pontuacao_baremo'], errors='coerce').fillna(0)
    df_final['efetividade_tecnico'] = pd.to_numeric(df_final['efetividade_tecnico'], errors='coerce').fillna(0)
    df_final['data_execucao'] = pd.to_datetime(df_final['data_execucao'], errors='coerce')
    
    df_final.to_sql('resultados_sla_zeus', engine, schema='importador', if_exists='replace', index=False)
    
    print("============================================================")
    print(" CALCULOS FINALIZADOS! Tabela importador.resultados_sla_zeus atualizada.")
    print("============================================================")

if __name__ == "__main__":
    calcular_produtividade()
