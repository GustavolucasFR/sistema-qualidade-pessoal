import pandas as pd
import json
import sys
import os
from pandas.tseries.offsets import CustomBusinessHour
from pandas.tseries.holiday import AbstractHolidayCalendar, Holiday
from sqlalchemy import create_engine

class FeriadosNacionais(AbstractHolidayCalendar):
    rules = [
        Holiday('Ano Novo', month=1, day=1),
        Holiday('Tiradentes', month=4, day=21),
        Holiday('Dia do Trabalho', month=5, day=1),
        Holiday('Independência', month=9, day=7),
        Holiday('Nossa Sra Aparecida', month=10, day=12),
        Holiday('Finados', month=11, day=2),
        Holiday('Proclamação da República', month=11, day=15),
        Holiday('Natal', month=12, day=25)
    ]

regras_sla_vivo = CustomBusinessHour(
    start='08:30', 
    end='18:00', 
    weekmask='Mon Tue Wed Thu Fri',  # type: ignore
    calendar=FeriadosNacionais()  # type: ignore
)

def calcular_horas_uteis(data_abertura, data_encerramento):
    try:
        if pd.isna(data_abertura) or pd.isna(data_encerramento):
            return None
        # Diferenca em horas (SLA Reparo eh medido em horas)
        delta = (data_encerramento - data_abertura).total_seconds() / 3600.0
        return max(0, delta)
    except Exception as e:
        return None

def parse_excel_dates(col):
    numeric = pd.to_numeric(col, errors='coerce')
    dates_num = pd.to_datetime(numeric, origin='1899-12-30', unit='D')
    dates_str = pd.to_datetime(col[numeric.isna()], format='mixed', errors='coerce')
    return dates_num.combine_first(dates_str)

def aplicar_regras(tabela_nome, tipo_planilha):
    try:
        engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
        df_bruto = pd.read_sql_table(tabela_nome, engine, schema='importador')
        
        caminho_config = os.path.join(os.path.dirname(__file__), 'regras_config.json')
        with open(caminho_config, 'r', encoding='utf-8') as f:
            configs = json.load(f)

        if tipo_planilha not in configs:
            raise ValueError(f"Configuração para o tipo '{tipo_planilha}' não encontrada no JSON.")

        regras = configs[tipo_planilha]
        colunas_obrigatorias = regras.get('colunas_obrigatorias', [])
        
        # Validar colunas
        for col in colunas_obrigatorias:
            if col not in df_bruto.columns:
                raise ValueError(f"A coluna obrigatória '{col}' está ausente na planilha.")

        if 'Estado' not in df_bruto.columns:
            df_bruto['Estado'] = 'Desconhecido'
        if 'Cidade' not in df_bruto.columns:
            df_bruto['Cidade'] = 'Desconhecido'
        
        # Mapeamento para nomes internos
        map_cols = configs.get('mapeamento_colunas', {})
        if map_cols:
            inv_map = {
                map_cols.get('cliente'): 'ID_Cliente',
                map_cols.get('tecnico'): 'Tecnico_Responsavel',
                map_cols.get('atividade'): 'Tipo_Atividade',
                map_cols.get('data_abertura'): 'Data_Abertura',
                map_cols.get('data_encerramento'): 'Data_Encerramento',
                map_cols.get('estado'): 'Estado',
                map_cols.get('cidade'): 'Cidade',
                map_cols.get('ordem'): 'ID_Ordem'
            }
            inv_map = {k: v for k, v in inv_map.items() if k is not None}
            df_bruto.rename(columns=inv_map, inplace=True)
            
        # Remover duplicatas da base bruta para evitar reprocessamento do mesmo dado
        if 'ID_Ordem' in df_bruto.columns:
            df_bruto.drop_duplicates(subset=['ID_Ordem'], inplace=True)
        else:
            df_bruto.drop_duplicates(inplace=True)
        
        # Converter datas
        if 'Data_Abertura' in df_bruto.columns and 'Data_Encerramento' in df_bruto.columns:
            df_bruto['Data_Abertura'] = parse_excel_dates(df_bruto['Data_Abertura'])
            df_bruto['Data_Encerramento'] = parse_excel_dates(df_bruto['Data_Encerramento'])
            
            # Buscar a data real (pois Início Previsto e Término geralmente são apenas horários no Zeus)
            col_criacao = next((c for c in df_bruto.columns if 'Cria' in c and 'Atividade' in c), None)
            col_agendada = next((c for c in df_bruto.columns if 'Agendada' in c), None)
            
            if col_criacao is not None:
                real_dates = parse_excel_dates(df_bruto[col_criacao])
            elif col_agendada is not None:
                real_dates = parse_excel_dates(df_bruto[col_agendada])
            else:
                real_dates = None
                
            if real_dates is not None:
                base_date = real_dates.dt.normalize()
                
                mask_abertura_1899 = df_bruto['Data_Abertura'].dt.year == 1899
                if mask_abertura_1899.any():
                    df_bruto.loc[mask_abertura_1899, 'Data_Abertura'] = base_date[mask_abertura_1899] + (df_bruto.loc[mask_abertura_1899, 'Data_Abertura'] - pd.Timestamp('1899-12-30'))
                    
                mask_encerramento_1899 = df_bruto['Data_Encerramento'].dt.year == 1899
                if mask_encerramento_1899.any():
                    df_bruto.loc[mask_encerramento_1899, 'Data_Encerramento'] = base_date[mask_encerramento_1899] + (df_bruto.loc[mask_encerramento_1899, 'Data_Encerramento'] - pd.Timestamp('1899-12-30'))

            # Extração de Competência (Mês/Ano)
            df_bruto['Mes_Referencia'] = df_bruto['Data_Encerramento'].dt.strftime('%m/%Y')

        penalizacoes = pd.DataFrame()

        if tipo_planilha == 'telefonica_anexo09':
            metas = regras.get('metas', {})
            ifi_limite = metas.get('ifi_dias_limite', 15)
            reincidencia_limite = metas.get('reincidencia_dias_limite', 30)
            sla_reparo_horas = metas.get('sla_reparo_horas_uteis', 8)

            # 1. Cálculo de Reincidência usando shift()
            # Foco em Reparos e Defeitos
            df_reparos = df_bruto[df_bruto['Tipo_Atividade'].astype(str).str.contains('Reparo|Defeito', case=False, na=False)].copy()
            df_reparos = df_reparos.sort_values(by=['ID_Cliente', 'Data_Abertura'])
            
            # Puxar data do último encerramento do mesmo cliente e o Mês
            df_reparos['Data_Encerramento_Anterior'] = df_reparos.groupby('ID_Cliente')['Data_Encerramento'].shift(1)
            df_reparos['Mes_Referencia_Anterior'] = df_reparos.groupby('ID_Cliente')['Mes_Referencia'].shift(1)
            
            # Calcular diferença em dias (precisão decimal para evitar 0 dias)
            df_reparos['Dias_Desde_Ultimo_Reparo'] = ((df_reparos['Data_Abertura'] - df_reparos['Data_Encerramento_Anterior']).dt.total_seconds() / 86400).round(1)
            
            # Identificar falhas de reincidência (intra-mês!)
            falhas_reincidencia = df_reparos[
                (df_reparos['Dias_Desde_Ultimo_Reparo'] <= reincidencia_limite) & 
                (df_reparos['Mes_Referencia'] == df_reparos['Mes_Referencia_Anterior'])
            ].copy()
            falhas_reincidencia['Motivo_Penalizacao'] = f'IRR (Retrabalho <= {reincidencia_limite} dias)'
            falhas_reincidencia['Dias_Apurados'] = falhas_reincidencia['Dias_Desde_Ultimo_Reparo']
            
            # 2. Cálculo de IFI usando merge()
            df_instalacoes = df_bruto[df_bruto['Tipo_Atividade'].astype(str).str.contains('Instal', case=False, na=False)].copy()
            
            # Cruzar instalações com reparos do mesmo cliente
            df_merge = pd.merge(df_instalacoes, df_reparos[['ID_Cliente', 'Data_Abertura', 'Mes_Referencia']], on='ID_Cliente', suffixes=('_Inst', '_Rep'))
            
            # Somente reparos que ocorreram DEPOIS da instalação e dentro do mesmo MÊS
            df_merge = df_merge[
                (df_merge['Data_Abertura_Rep'] >= df_merge['Data_Encerramento']) & 
                (df_merge['Mes_Referencia_Inst'] == df_merge['Mes_Referencia_Rep'])
            ]
            
            # Calcular dias entre instalação e reparo
            df_merge['Dias_Instalacao_Ate_Reparo'] = ((df_merge['Data_Abertura_Rep'] - df_merge['Data_Encerramento']).dt.total_seconds() / 86400).round(1)
            
            # Identificar falhas de IFI
            falhas_ifi = df_merge[df_merge['Dias_Instalacao_Ate_Reparo'] <= ifi_limite].copy()
            falhas_ifi.rename(columns={'Mes_Referencia_Inst': 'Mes_Referencia'}, inplace=True)
            
            # Para IFI, quem é penalizado é o técnico da instalação
            falhas_ifi = falhas_ifi.drop_duplicates(subset=['ID_Cliente', 'Data_Encerramento'])
            
            falhas_ifi['Motivo_Penalizacao'] = f'IFI <= {ifi_limite} dias'
            falhas_ifi['Dias_Apurados'] = falhas_ifi['Dias_Instalacao_Ate_Reparo']
            
            # 3. Cálculo de Prazo SLA de Reparo (Horas Úteis)
            df_sla_reparo = df_bruto[df_bruto['Tipo_Atividade'].astype(str).str.contains('Reparo|Defeito', case=False, na=False)].copy()
            df_sla_reparo['Horas_Uteis_Gastas'] = df_sla_reparo.apply(
                lambda row: calcular_horas_uteis(row['Data_Abertura'], row['Data_Encerramento']), axis=1
            )
            falhas_sla = df_sla_reparo[df_sla_reparo['Horas_Uteis_Gastas'] > sla_reparo_horas].copy()
            falhas_sla['Motivo_Penalizacao'] = f'SLA Reparo > {sla_reparo_horas}h'
            falhas_sla['Dias_Apurados'] = falhas_sla['Horas_Uteis_Gastas']
            
            # Consolida as penalizações
            colunas_comuns = ['ID_Cliente', 'Tecnico_Responsavel', 'Motivo_Penalizacao', 'Dias_Apurados', 'Mes_Referencia', 'Estado', 'Cidade']
            
            # Cria DataFrames vazios com as colunas caso não haja falhas para evitar erro no concat
            if falhas_reincidencia.empty:
                falhas_reincidencia = pd.DataFrame(columns=colunas_comuns)
            if falhas_ifi.empty:
                falhas_ifi = pd.DataFrame(columns=colunas_comuns)
            if falhas_sla.empty:
                falhas_sla = pd.DataFrame(columns=colunas_comuns)
                
            penalizacoes = pd.concat([
                falhas_reincidencia[colunas_comuns], 
                falhas_ifi[colunas_comuns],
                falhas_sla[colunas_comuns]
            ], ignore_index=True)

            # --- CÁLCULO DE KPIs GLOBAIS POR MÊS (Health Check) ---
            metas_globais = regras.get('metas_globais', {})
            base_clientes = metas_globais.get('base_clientes_ativa', 50000)
            
            df_instalacoes['Dias_Gastos'] = (df_instalacoes['Data_Encerramento'] - df_instalacoes['Data_Abertura']).dt.days
            
            resumo_kpis_por_mes = {}
            meses_unicos = df_bruto['Mes_Referencia'].dropna().unique()
            
            for mes in meses_unicos:
                df_sla_mes = df_sla_reparo[df_sla_reparo['Mes_Referencia'] == mes]
                df_inst_mes = df_instalacoes[df_instalacoes['Mes_Referencia'] == mes]
                
                # Reparos
                total_reparos = len(df_sla_mes)
                if total_reparos > 0:
                    reparo_4h = (len(df_sla_mes[df_sla_mes['Horas_Uteis_Gastas'] <= 4]) / total_reparos) * 100
                    outlier_12h = (len(df_sla_mes[df_sla_mes['Horas_Uteis_Gastas'] > 12]) / total_reparos) * 100
                    tmr = (df_sla_mes['Horas_Uteis_Gastas'].sum() * 60) / total_reparos
                    bd_planta = (total_reparos / base_clientes) * 100
                else:
                    reparo_4h, outlier_12h, tmr, bd_planta = 100.0, 0.0, 0.0, 0.0
                    
                # Instalações
                total_instalacoes = len(df_inst_mes)
                if total_instalacoes > 0:
                    efetividade_altas = (len(df_inst_mes[df_inst_mes['Dias_Gastos'] <= 0]) / total_instalacoes) * 100
                    minima_agenda = (len(df_inst_mes[df_inst_mes['Dias_Gastos'] <= 5]) / total_instalacoes) * 100
                else:
                    efetividade_altas, minima_agenda = 100.0, 100.0

                # Scorecard
                pontos = 100
                if reparo_4h < metas_globais.get('reparo_4h', {}).get('saudavel_min', 92): pontos -= 10
                if outlier_12h > metas_globais.get('outlier_12h', {}).get('critico_min', 8): pontos -= 15
                elif outlier_12h > metas_globais.get('outlier_12h', {}).get('ideal_max', 3): pontos -= 5
                if tmr > metas_globais.get('tmr', {}).get('critico_min', 240): pontos -= 10
                elif tmr > metas_globais.get('tmr', {}).get('ideal_max', 180): pontos -= 5
                if efetividade_altas < metas_globais.get('efetividade_altas', {}).get('meta_min', 90): pontos -= 5
                if minima_agenda < metas_globais.get('minima_agenda', {}).get('meta_min', 90): pontos -= 5
                if bd_planta > metas_globais.get('bd_planta', {}).get('critico_min', 4): pontos -= 15
                elif bd_planta > metas_globais.get('bd_planta', {}).get('ideal_max', 2): pontos -= 5

                if pontos >= 85: nota_letra = 'A'
                elif pontos >= 70: nota_letra = 'B'
                elif pontos >= 60: nota_letra = 'C'
                elif pontos >= 50: nota_letra = 'D'
                else: nota_letra = 'Z'

                resumo_kpis_por_mes[mes] = {
                    "nota": nota_letra,
                    "pontos": pontos,
                    "reparo_4h": round(reparo_4h, 2),
                    "outlier_12h": round(outlier_12h, 2),
                    "tmr": round(tmr, 2),
                    "efetividade_altas": round(efetividade_altas, 2),
                    "minima_agenda": round(minima_agenda, 2),
                    "bd_planta": round(bd_planta, 2)
                }

        if not penalizacoes.empty:
            penalizacoes['Tabela_Origem'] = tabela_nome
            penalizacoes.to_sql('resultado_penalizacoes', engine, schema='importador', if_exists='append', index=False)

        if tipo_planilha == 'telefonica_anexo09':
            kpi_records = []
            for mes, kpis in resumo_kpis_por_mes.items():
                kpis['Mes_Referencia'] = mes
                kpis['Tabela_Origem'] = tabela_nome
                kpi_records.append(kpis)
            
            if kpi_records:
                df_kpis = pd.DataFrame(kpi_records)
                df_kpis.to_sql('resultado_kpis', engine, schema='importador', if_exists='append', index=False)

        resultado = {
            "status": "sucesso",
            "kpis": {
                "total_linhas": len(df_bruto),
                "total_penalizacoes": len(penalizacoes)
            },
            "tabela_saida": "resultado_penalizacoes"
        }
        print(json.dumps(resultado))

    except Exception as e:
        print(json.dumps({"status": "erro", "mensagem": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 2:
        aplicar_regras(sys.argv[1], sys.argv[2])
    else:
        print(json.dumps({"status": "erro", "mensagem": "Parâmetros insuficientes."}))
