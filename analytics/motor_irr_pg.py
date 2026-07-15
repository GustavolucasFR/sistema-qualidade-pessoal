import pandas as pd
from sqlalchemy import create_engine, text
import sys

def processar_irr(mes):
    print(f"Iniciando processamento de IRR (Reincidência) para o mês: {mes}")
    engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
    try:
        df = pd.read_sql_table(mes, engine, schema='importador')
    except Exception as e:
        print(f"Erro lendo a tabela {mes}: {e}")
        return
        
    if df.empty:
        print(f"Tabela {mes} está vazia. Nenhuma falha IRR gerada.")
        return

    # Usar 'Instância de Serviço' ou 'ID Chat' como identificador do cliente
    col_cliente = next((c for c in df.columns if 'Instância de Serviço' in c), None)
    if not col_cliente:
        col_cliente = next((c for c in df.columns if 'ID Chat' in c), None)

    if not col_cliente:
        print("Coluna de identificação do cliente não encontrada.")
        return

    col_termino = next((c for c in df.columns if 'Término' in c or 'Encerramento' in c), None)
    if not col_termino:
        print("Coluna de Término não encontrada.")
        return

    # Limpar dados
    df_reparos = df.dropna(subset=[col_cliente, col_termino]).copy()
    df_reparos[col_termino] = pd.to_numeric(df_reparos[col_termino], errors='coerce')
    df_reparos = df_reparos.sort_values(by=[col_cliente, col_termino])
    
    # Calcular diferença de tempo para o ticket anterior do mesmo cliente
    df_reparos['termino_anterior'] = df_reparos.groupby(col_cliente)[col_termino].shift(1)
    df_reparos['tecnico_anterior'] = df_reparos.groupby(col_cliente)['Tecnicos'].shift(1)
    
    # Diferença em dias (assumindo que o campo numérico seja excel date ou datetime unix, aqui simulamos diferença direta)
    # No excel, 1 unidade = 1 dia.
    df_reparos['dias_diferenca'] = df_reparos[col_termino] - df_reparos['termino_anterior']
    
    # Considerar falha se a diferença for menor ou igual a 30 dias e maior que 0
    falhas = df_reparos[(df_reparos['dias_diferenca'] <= 30) & (df_reparos['dias_diferenca'] > 0)].copy()
    
    if falhas.empty:
        print("Nenhuma falha de Reincidência (IRR) encontrada.")
        return
        
    resultados = []
    for _, row in falhas.iterrows():
        resultados.append({
            'competencia': mes,
            'cliente_id': str(row[col_cliente]),
            'tecnico_instalador': str(row.get('tecnico_anterior', 'Desconhecido')),
            'tecnico_reparo': str(row.get('Tecnicos', 'Desconhecido')),
            # simulando datas nulas já que temos os numéricos
            'dias_diferenca': int(row['dias_diferenca']),
            'status_irr': 'FALHA IRR (<=30 dias)'
        })
        
    df_res = pd.DataFrame(resultados)
    
    # Limpar registros anteriores do mesmo mês para evitar duplicação em caso de reprocessamento
    with engine.begin() as conn:
        conn.execute(text(f"DELETE FROM importador.resultados_irr WHERE competencia = '{mes}'"))
        
    df_res.to_sql('resultados_irr', engine, schema='importador', if_exists='append', index=False)
    print(f"✅ {len(df_res)} falhas de IRR processadas e inseridas no banco para o mês {mes}.")

if __name__ == "__main__":
    mes = sys.argv[1] if len(sys.argv) > 1 else 'jan'
    processar_irr(mes)
