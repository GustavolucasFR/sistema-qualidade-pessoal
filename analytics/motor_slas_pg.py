import pandas as pd
from sqlalchemy import create_engine, text
import sys

def processar_slas(mes):
    print(f"Iniciando processamento de SLAs para o mês: {mes}")
    engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
    try:
        df = pd.read_sql_table(mes, engine, schema='importador')
    except Exception as e:
        print(f"Erro lendo a tabela {mes}: {e}")
        return
        
    if df.empty:
        print(f"Tabela {mes} está vazia. Nenhuma falha de SLA gerada.")
        return
        
    df_reparos = df.copy()

    col_sla_fim = next((c for c in df.columns if 'SLA Fim' in c), None)
    col_termino = next((c for c in df.columns if 'Término' in c or 'Encerramento' in c), None)
    
    if not col_sla_fim or not col_termino:
        print("Colunas de SLA ou Término não encontradas na tabela.")
        return
        
    df_reparos['sla_fim_num'] = pd.to_numeric(df_reparos[col_sla_fim], errors='coerce')
    df_reparos['termino_num'] = pd.to_numeric(df_reparos[col_termino], errors='coerce')
    
    # Extrair apenas a parte decimal (hora) se termino for < 1 e sla > 1
    import numpy as np
    df_reparos['sla_fim_comp'] = np.where((df_reparos['termino_num'] < 1) & (df_reparos['sla_fim_num'] > 1), df_reparos['sla_fim_num'] % 1, df_reparos['sla_fim_num'])
    df_reparos['termino_comp'] = np.where((df_reparos['termino_num'] < 1) & (df_reparos['sla_fim_num'] > 1), df_reparos['termino_num'] % 1, df_reparos['termino_num'])

    # Condição de falha: Término ocorreu após o SLA Fim
    falhas = df_reparos[df_reparos['termino_comp'] > df_reparos['sla_fim_comp']].copy()
    
    if falhas.empty:
        print("Nenhuma falha de SLA encontrada para os dados atuais.")
        return
        
    resultados = []
    for _, row in falhas.iterrows():
        id_atv = row.get('ID Chat')
        if pd.isna(id_atv):
            id_atv = row.get('Instância de Serviço', 0)
            
        resultados.append({
            'competencia': mes,
            'tecnico': str(row.get('Tecnicos', 'Desconhecido')),
            'empresa': str(row.get('Empresa', 'Desconhecido')),
            'cidade': str(row.get('Cidade', 'Desconhecido')),
            'id_atividade': int(id_atv) if not pd.isna(id_atv) else 0,
            'sla_comeco': float(row.get('SLA Começo', 0)) if not pd.isna(row.get('SLA Começo', 0)) else 0.0,
            'sla_fim': float(row['sla_fim_num']),
            'termino_real': float(row['termino_num']),
            'status_sla': 'FALHA',
            'tempo_excedido': float(row['termino_comp'] - row['sla_fim_comp']) * 24 # Convertendo fração de dia para horas
        })
        
    df_res = pd.DataFrame(resultados)
    
    # Limpar registros anteriores do mesmo mês para evitar duplicação em caso de reprocessamento
    with engine.begin() as conn:
        conn.execute(text(f"DELETE FROM importador.resultados_sla WHERE competencia = '{mes}'"))
        
    df_res.to_sql('resultados_sla', engine, schema='importador', if_exists='append', index=False)
    print(f"✅ {len(df_res)} falhas de SLA processadas e inseridas no banco para o mês {mes}.")

if __name__ == "__main__":
    mes = sys.argv[1] if len(sys.argv) > 1 else 'jan'
    processar_slas(mes)
