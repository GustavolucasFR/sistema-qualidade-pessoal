import os
import sys
import pandas as pd
from sqlalchemy import create_engine
import math

sys.stdout.reconfigure(encoding='utf-8')

# Database configuration
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASS = os.getenv('DB_PASS', 'postgres')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'postgres')

# Tentar ligar ao DB
engine = create_engine(f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

def processar_efetividade():
    arquivo_alvo = "C:\\Users\\TECNOMULTI\\sistema-qualidade\\dados\\1_uploads_brutos\\Efetividade.xlsb"
    
    if not os.path.exists(arquivo_alvo):
        print(f"Erro: Arquivo não encontrado: {arquivo_alvo}")
        return

    print(" Lendo arquivo Efetividade.xlsb (Pode demorar alguns minutos devido ao tamanho)...")
    
    try:
        # Lendo o XLSB
        df = pd.read_excel(arquivo_alvo, engine='pyxlsb')
        total_linhas = len(df)
        print(f" Arquivo carregado com {total_linhas} linhas.")

        # Mapeamento de colunas necessárias
        # ['Número da Ordem de Serviço', 'Status', 'Cidade', 'TÉCNICO', 'Término da Atividade', 'Data Agendada para Execução']
        
        # Filtros de segurança
        if 'Nmero da Ordem de Servio' in df.columns:
            df.rename(columns={'Nmero da Ordem de Servio': 'id_atividade'}, inplace=True)
        elif 'Número da Ordem de Serviço' in df.columns:
            df.rename(columns={'Número da Ordem de Serviço': 'id_atividade'}, inplace=True)
            
        if 'Status' not in df.columns:
            print("Erro: Coluna 'Status' não encontrada.")
            return

        if 'TCNICO' in df.columns:
            df.rename(columns={'TCNICO': 'tecnico'}, inplace=True)
        elif 'TÉCNICO' in df.columns:
            df.rename(columns={'TÉCNICO': 'tecnico'}, inplace=True)
        else:
            df['tecnico'] = df['Recurso'] if 'Recurso' in df.columns else 'Desconhecido'

        # Resolver Data
        if 'Trmino da Atividade' in df.columns:
            df['data_execucao'] = df['Trmino da Atividade']
        elif 'Término da Atividade' in df.columns:
             df['data_execucao'] = df['Término da Atividade']
        elif 'Data Agendada para Execuo' in df.columns:
             df['data_execucao'] = df['Data Agendada para Execuo']
        elif 'Data Agendada para Execução' in df.columns:
             df['data_execucao'] = df['Data Agendada para Execução']
        else:
             df['data_execucao'] = pd.Timestamp.now()

        # Limpar id_atividade e drop NaNs
        df = df.dropna(subset=['id_atividade'])
        
        print(" Transformando Status em Efetividade Matemática...")
        # Regra de negócio aprovada: CONCLUÍDA = 100, Resto = 0
        df['efetividade_tecnico'] = df['Status'].apply(lambda x: 100 if str(x).strip().upper() == 'CONCLUÍDA' or str(x).strip().upper() == 'CONCLUDA' else 0)
        
        # Preparar dados para Upsert
        df_to_insert = df[['id_atividade', 'tecnico', 'Cidade', 'data_execucao', 'efetividade_tecnico']].copy()
        df_to_insert.rename(columns={'Cidade': 'cidade'}, inplace=True)
        
        # Converter para datetime
        df_to_insert['data_execucao'] = pd.to_datetime(df_to_insert['data_execucao'], errors='coerce')
        
        # Forçar string
        df_to_insert['id_atividade'] = df_to_insert['id_atividade'].astype(str).str.replace(r'\.0$', '', regex=True)
        
        # UPSERT manual (batching)
        records = df_to_insert.to_dict('records')
        
        print(" Preparando Inserção/Atualização no PostgreSQL...")
        
        # Usaremos SQL direto pelo psycopg2 engine
        conn = engine.raw_connection()
        cursor = conn.cursor()
        
        insert_query = """
            INSERT INTO importador.resultados_sla (id_atividade, tecnico, cidade, data_execucao, efetividade_tecnico, competencia)
            VALUES (%s, %s, %s, %s, %s, 'Jun/2026')
            ON CONFLICT (id_atividade) DO UPDATE SET 
                efetividade_tecnico = EXCLUDED.efetividade_tecnico,
                data_execucao = EXCLUDED.data_execucao,
                tecnico = EXCLUDED.tecnico,
                cidade = EXCLUDED.cidade;
        """
        
        # Executar em batch
        batch_size = 5000
        sucessos = 0
        for i in range(0, len(records), batch_size):
            batch = records[i:i+batch_size]
            valores = []
            for r in batch:
                data_val = r['data_execucao'] if pd.notnull(r['data_execucao']) else None
                try:
                    # Garantir que id_atividade possa ser BIGINT no postgres, mas aqui passamos como string para nao quebrar limits
                    valores.append((r['id_atividade'], str(r['tecnico']), str(r['cidade']), data_val, float(r['efetividade_tecnico'])))
                except:
                    pass
            
            if valores:
                cursor.executemany(insert_query, valores)
                conn.commit()
                sucessos += len(valores)
                print(f" > Processadas {sucessos} / {total_linhas} tarefas...")

        cursor.close()
        conn.close()
        print(" Processamento de Efetividade concluído com sucesso!")

    except Exception as e:
        print(f"Erro fatal: {e}")

if __name__ == "__main__":
    processar_efetividade()
