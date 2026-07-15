import pandas as pd
from sqlalchemy import create_engine, text
import unicodedata
import re
import os
import glob

def clean_column_name(col):
    col = str(col).lower().strip()
    col = unicodedata.normalize('NFKD', col).encode('ASCII', 'ignore').decode('utf-8')
    col = re.sub(r'[^a-z0-9_]', '_', col)
    col = re.sub(r'_+', '_', col)
    col = col.strip('_')
    return col

def clean_column_name_legacy(col):
    col = str(col).lower().strip()
    # Antigo comportamento que transformava acentos em '_'
    col = re.sub(r'[^a-z0-9_]', '_', col)
    return col

# Diretorios para buscar arquivos
folder_brutos = r'C:\Users\TECNOMULTI\sistema-qualidade\dados\1_uploads_brutos'
folder_consolidados = r'C:\Users\TECNOMULTI\sistema-qualidade\dados\2_dados_consolidados'
folder_downloads = r'C:\Users\TECNOMULTI\Downloads'

import sys

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')

# Pega todos os arquivos BA
files = []

if len(sys.argv) > 1:
    files = [sys.argv[1]]
else:
    # Adiciona as variacoes de ProducaoBA
    for folder in [folder_brutos, folder_consolidados, folder_downloads]:
        files.extend(glob.glob(os.path.join(folder, '**', '*ProducaoBA*.xlsb'), recursive=True))
        files.extend(glob.glob(os.path.join(folder, '**', '*ProduçãoBA*.xlsb'), recursive=True))
        files.extend(glob.glob(os.path.join(folder, '**', '*Producao BA*.xlsb'), recursive=True))
        # E os de Zeus que já usavam
        files.extend(glob.glob(os.path.join(folder, '**', '*Zeus*.xlsb'), recursive=True))
        files.extend(glob.glob(os.path.join(folder, '**', '*Zeus*.xlsx'), recursive=True))

files = [f for f in set(files) if not os.path.basename(f).startswith('~$')]
files.sort(key=lambda x: os.path.getmtime(x), reverse=True)

if not files:
    print("Nenhum arquivo ProducaoBA ou Zeus encontrado.")
    sys.exit()

for file_path in files:
    print(f"\n=========================================")
    print(f"Lendo {file_path}...")
    engine_str = 'pyxlsb' if file_path.endswith('.xlsb') else 'openpyxl'
    
    # 1. IMPORTAR ABA ZEUS
    try:
        is_raw_zeus = "zeus" in os.path.basename(file_path).lower() and "producao" not in os.path.basename(file_path).lower()
        
        if is_raw_zeus:
            print("Identificado como arquivo bruto Zeus. Buscando cabecalho...")
            df_temp = pd.read_excel(file_path, engine=engine_str, header=None, nrows=20, dtype=str)
            header_idx = 0
            for idx, row in df_temp.iterrows():
                row_str = ' '.join([str(v).lower() for v in row.values])
                if 'tecnico' in row_str and 'status' in row_str and 'cidade' in row_str:
                    header_idx = idx
                    break
            df_zeus = pd.read_excel(file_path, engine=engine_str, header=header_idx, dtype=str)
        else:
            print("Lendo aba 'Zeus' (Planilha Consolidada)...")
            df_zeus = pd.read_excel(file_path, sheet_name='Zeus', engine=engine_str, dtype=str)
            
        df_zeus.columns = [clean_column_name_legacy(c) for c in df_zeus.columns]
        
        # Tratar colunas de datas que podem estar vindo como serial do Excel (ex: 46198)
        date_columns = ['data_agendada_para_execu__o', 't_rmino_da_atividade', 'in_cio_previsto', 'data_de_cria__o_da_atividade']
        for dc in date_columns:
            if dc in df_zeus.columns:
                combined = pd.to_datetime(
                    pd.to_numeric(df_zeus[dc], errors='coerce'), 
                    origin='1899-12-30', 
                    unit='D'
                ).combine_first(pd.to_datetime(df_zeus[dc], errors='coerce'))
                
                combined = pd.to_datetime(combined, errors='coerce')
                df_zeus[dc] = combined.dt.strftime('%Y-%m-%d %H:%M:%S')

        # Remover colunas novas indesejadas que causam erro no to_sql (em formato legacy)
        colunas_indesejadas = ['ciclo', 'periodo', 'receita_total', 'preventiva_r', 'receita_vivo__1', 'receita_fibrasil__1', 'ptbaremo', 'receita_vivo__999', 'receita_fibrasil__999', 'cluster__999', 'subcluster__999']
        
        # Obter colunas reais da base para manter só o que existe
        print("Obtendo colunas existentes na tabela zeus_consolidado para evitar quebra...")
        with engine.connect() as con:
            existing_cols_result = con.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'importador' AND table_name = 'zeus_consolidado'"))
            existing_cols = [row[0] for row in existing_cols_result]
            
            if existing_cols:
                cols_to_keep = [c for c in df_zeus.columns if c in existing_cols]
                df_zeus = df_zeus[cols_to_keep]
        
        # Tratamento especial para colunas duplicadas
        df_zeus = df_zeus.loc[:, ~df_zeus.columns.duplicated()]
            
        print("Salvando dados do Zeus (modo Append para não apagar meses anteriores)...")
        with engine.connect() as con:
            df_zeus.to_sql('zeus_consolidado', engine, schema='importador', if_exists='append', index=False)
        # Mover a criacao da view para o final, depois que as tabelas extra forem criadas!
        print("Dados do Zeus salvos com sucesso. A view sera criada no final.")
    except Exception as e:
        print(f"Erro ao importar dados Zeus de {file_path}: {e}")

    # 2. IMPORTAR ABA DRE (METAS)
    if not is_raw_zeus:
        try:
            print("Lendo aba 'DRE' para Metas...")
            df_dre = pd.read_excel(file_path, sheet_name='DRE', engine=engine_str, header=None)
            
            metas_data = []
            months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"]
            
            # Linhas de 5 a 15 contem as metas (index 0 based, header=None)
            for i in range(5, 15):
                if i >= len(df_dre): break
                row = df_dre.iloc[i]
                if len(row) <= 7: continue
                cidade = str(row[7]).strip().upper()
                if pd.isna(row[7]) or cidade == 'NAN' or cidade == '': continue
                if cidade == 'JOÃO PESSOA': cidade = 'JOAO PESSOA' # Padronizacao do banco
                
                # As metas comecam na coluna 8 (index 8 = Jan, 9 = Fev, etc)
                for m_idx, m_name in enumerate(months):
                    col_idx = 8 + m_idx
                    if col_idx < len(row):
                        val = row[col_idx]
                        if pd.notna(val):
                            try:
                                val_num = float(val)
                                metas_data.append({
                                    'cidade': cidade,
                                    'mes_nome': m_name,
                                    'mes_num': m_idx + 1,
                                    'meta_orcada': val_num
                                })
                            except:
                                pass
            
            if metas_data:
                df_metas = pd.DataFrame(metas_data)
                with engine.connect() as con:
                    con.execute(text("TRUNCATE TABLE importador.metas_dre;"))
                    con.commit()
                df_metas.to_sql('metas_dre', engine, schema='importador', if_exists='append', index=False)
                print(f"Aba DRE salva com sucesso! ({len(metas_data)} metas inseridas)")
        except Exception as e:
            print(f"Erro ao importar aba DRE de {file_path}: {e}")

    # 3. IMPORTAR ABA FERIADOS
    if not is_raw_zeus:
        try:
            print("Lendo aba 'Feriados'...")
            df_feriados = pd.read_excel(file_path, sheet_name='Feriados', engine=engine_str, header=None)
            
            feriados_data = []
            
            # Mapeamento de colunas para cidades (index 0 based)
            # 6: Natal, 8: João Pessoa, 10: Recife, 12: Caruaru, 14: Campina Grande, 16: Patos, 18: Garanhus
            city_cols = {
                6: 'NATAL',
                8: 'JOAO PESSOA',
                10: 'RECIFE',
                12: 'CARUARU',
                14: 'CAMPINA GRANDE',
                16: 'PATOS',
                18: 'GARANHUNS'
            }
            
            # Dados comecam na linha 2 (index 2)
            for i in range(2, len(df_feriados)):
                row = df_feriados.iloc[i]
                # Data serial do Excel fica na coluna 1
                data_serial = row[1]
                if pd.isna(data_serial): continue
                
                try:
                    data_feriado = pd.to_datetime(data_serial, unit='D', origin='1899-12-30').date()
                except:
                    continue
                    
                for col_cidade, nome_cidade in city_cols.items():
                    if col_cidade < len(row):
                        feriado_val = row[col_cidade]
                        if pd.notna(feriado_val) and str(feriado_val).strip() != '':
                            descricao = ''
                            if col_cidade + 1 < len(row):
                                descricao = str(row[col_cidade + 1]).strip()
                            
                            feriados_data.append({
                                'cidade': nome_cidade,
                                'data_feriado': data_feriado,
                                'descricao': descricao
                            })
            
            if feriados_data:
                df_feriados_import = pd.DataFrame(feriados_data)
                df_feriados_import.drop_duplicates(subset=['cidade', 'data_feriado'], inplace=True)
                with engine.connect() as con:
                    con.execute(text("TRUNCATE TABLE importador.feriados_cidade;"))
                    con.commit()
                df_feriados_import.to_sql('feriados_cidade', engine, schema='importador', if_exists='append', index=False)
                print(f"Aba Feriados salva com sucesso! ({len(df_feriados_import)} feriados inseridos)")
                
                # Se salvou metas e feriados com sucesso, podemos parar (encontramos a planilha BA principal)
                # wait, first let's import Extra
        except Exception as e:
            print(f"Erro ao importar aba Feriados de {file_path}: {e}")

    # 4. IMPORTAR ABA EXTRA (REGRAS DE RECEITA)
    if not is_raw_zeus:
        try:
            print("Lendo aba 'Extra' para Regras de Receita...")
            df_extra = pd.read_excel(file_path, sheet_name='Extra', engine=engine_str)
            
            col_chave = None
            col_vivo = None
            col_fibrasil = None
            
            for c in df_extra.columns:
                c_clean = str(c).upper().strip()
                if not col_chave and c_clean == 'CHAVE':
                    col_chave = c
                elif not col_vivo and c_clean == 'RECEITA VIVO':
                    col_vivo = c
                elif not col_fibrasil and c_clean == 'RECEITA FIBRASIL':
                    col_fibrasil = c
                    
            if col_chave and col_vivo and col_fibrasil:
                df_rules = df_extra[[col_chave, col_vivo, col_fibrasil]].dropna(subset=[col_chave])
                df_rules = df_rules.rename(columns={
                    col_chave: 'chave',
                    col_vivo: 'receita_vivo',
                    col_fibrasil: 'receita_fibrasil'
                })
                # Remover chaves vazias ou com espaços em branco apenas
                df_rules = df_rules[df_rules['chave'].str.strip() != '']
                df_rules['receita_vivo'] = pd.to_numeric(df_rules['receita_vivo'], errors='coerce').fillna(0)
                df_rules['receita_fibrasil'] = pd.to_numeric(df_rules['receita_fibrasil'], errors='coerce').fillna(0)
                # Remover chaves duplicadas para evitar UniqueViolation
                df_rules = df_rules.drop_duplicates(subset=['chave'], keep='first')
                
                with engine.connect() as con:
                    con.execute(text("TRUNCATE TABLE importador.regras_receita_extra;"))
                    con.commit()
                df_rules.to_sql('regras_receita_extra', engine, schema='importador', if_exists='append', index=False)
                print(f"Aba Extra (Regras) salva com sucesso! ({len(df_rules)} regras inseridas)")
                
                 # Regras extras de reparo e preventivas foram revertidas e removidas.
                
                # Importar mapeamento de Macro Atividades (ATIVIDADE ZEUS, MACRO ATIVIDADE)
                col_atv_zeus = None
                col_macro_atv = None
                for c in df_extra.columns:
                    c_clean = str(c).upper().strip()
                    if c_clean == 'ATIVIDADE ZEUS': col_atv_zeus = c
                    elif c_clean == 'MACRO ATIVIDADE': col_macro_atv = c
                
                if col_atv_zeus and col_macro_atv:
                    df_macro = df_extra[[col_atv_zeus, col_macro_atv]].dropna(subset=[col_atv_zeus])
                    df_macro = df_macro.rename(columns={
                        col_atv_zeus: 'atividade_zeus',
                        col_macro_atv: 'macro_atividade'
                    })
                    df_macro = df_macro[df_macro['atividade_zeus'].str.strip() != '']
                    
                    with engine.connect() as con:
                        con.execute(text("DROP TABLE IF EXISTS importador.macro_atividades;"))
                        con.execute(text("CREATE TABLE importador.macro_atividades (atividade_zeus text, macro_atividade text);"))
                        con.commit()
                    df_macro.to_sql('macro_atividades', engine, schema='importador', if_exists='append', index=False)
                    print(f"Aba Extra (Macro Atividades) salva com sucesso! ({len(df_macro)} mapeamentos inseridos)")

                # Encontramos a planilha BA principal e lemos DRE, Feriados e Extra
                break
        except Exception as e:
            print(f"Erro ao importar aba Extra de {file_path}: {e}")

# Atualizar o Motor Central (Data Mart) após qualquer importação
try:
    with engine.connect() as con:
        print("Removendo possíveis duplicidades de Zeus...")
        con.execute(text("""
            WITH ranked AS (
                SELECT ctid,
                       ROW_NUMBER() OVER(
                           PARTITION BY n_mero_da_ordem_de_servi_o 
                           ORDER BY 
                               ctid DESC
                       ) as rn
                FROM importador.zeus_consolidado
                WHERE n_mero_da_ordem_de_servi_o IS NOT NULL AND TRIM(n_mero_da_ordem_de_servi_o) != ''
            )
            DELETE FROM importador.zeus_consolidado 
            WHERE ctid IN (
                SELECT ctid FROM ranked WHERE rn > 1
            );
        """))
        con.commit()
        
        print("Criando View importador.producao_ba_detalhado dinamicamente...")
        # Drop old views if they exist to recreate them with new columns
        try:
            con.execute(text("DROP MATERIALIZED VIEW IF EXISTS importador.fatos_dashboard CASCADE;"))
            con.execute(text("DROP VIEW IF EXISTS importador.producao_ba_detalhado CASCADE;"))
            con.commit()
        except:
            pass

        view_sql = """
        CREATE VIEW importador.producao_ba_detalhado AS
        SELECT 
            login_tecnico::double precision as login_tecnico,
            cidade::text,
            cidade::text as cluster,
            tipo_de_atividade::text as macro_ativdade,
            0.0::double precision as ptbaremo,
            COALESCE(re.receita_vivo, r.receita_vivo, 0) as receita_vivo,
            COALESCE(re.receita_fibrasil, r.receita_fibrasil, 0) as receita_fibrasil,
            (COALESCE(re.receita_vivo, r.receita_vivo, 0) + COALESCE(re.receita_fibrasil, r.receita_fibrasil, 0)) as receita_total,
            0::bigint as data_agendada_para_execucao,
            NULL::text as periodo,
            NULL::text as ciclo,
            status::text,
            empresa::text,
            tipo_de_atividade::text,
            data_agendada_para_execu__o::timestamp as data
        FROM importador.zeus_consolidado pd
        LEFT JOIN importador.regras_receita_extra re ON UPPER(TRIM(re.chave)) = UPPER(
            TRIM(pd.tipo_de_atividade) || TRIM(pd.estado) || TRIM(pd.tecnologia) || 
            CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
            CASE 
              WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'não' THEN 'Não'
              WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'sim' THEN 'Sim'
              WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'sim parcialmente' THEN 'Sim'
              WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'sim - parcial' THEN 'Sim'
              ELSE '-'
            END ||
            CASE 
              WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'não' THEN 'Não' 
              WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
              ELSE '-' 
            END
        )
        LEFT JOIN importador.regras_receita r ON UPPER(TRIM(r.chave)) = UPPER(
            TRIM(pd.tipo_de_atividade) || TRIM(pd.estado) || TRIM(pd.tecnologia) || 
            CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
            CASE 
              WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'não' THEN 'Não' 
              WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
              ELSE '-' 
            END
        );
        """
        con.execute(text(view_sql))
        con.commit()
        print("View de Zeus configurada com sucesso!")

        print("Atualizando Motor Central de Análises (fatos_dashboard)...")
        # Usar subprocess para executar test_motor.js que cria a materialized view
        import subprocess
        result = subprocess.run(
            ['node', 'test_motor.js'],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print("Motor Central atualizado com sucesso!")
            print(result.stdout)
        else:
            print(f"Erro ao atualizar Motor Central: {result.stderr}")
    
except Exception as e:
    print(f"Erro na etapa final da importação: {e}")

print("\nProcesso de importação concluído!")
