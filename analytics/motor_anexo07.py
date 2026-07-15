import pandas as pd
import json
import sys
import os
from sqlalchemy import create_engine

def parse_excel_dates(col):
    numeric = pd.to_numeric(col, errors='coerce')
    dates_num = pd.to_datetime(numeric, origin='1899-12-30', unit='D')
    dates_str = pd.to_datetime(col[numeric.isna()], format='mixed', errors='coerce')
    return dates_num.combine_first(dates_str)

def aplicar_multas_anexo07(tabela_nome):
    try:
        engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
        df_bruto = pd.read_sql_table(tabela_nome, engine, schema='importador')
            
        caminho_config = os.path.join(os.path.dirname(__file__), 'regras_config.json')
        with open(caminho_config, 'r', encoding='utf-8') as f:
            configs = json.load(f)

        if 'telefonica_anexo07_financeiro' not in configs:
            raise ValueError("Configuração 'telefonica_anexo07_financeiro' não encontrada.")

        regras_financeiras = configs['telefonica_anexo07_financeiro']
        colunas_obrigatorias = regras_financeiras.get('colunas_obrigatorias', [])
        
        # Mapeamento para nomes internos
        map_cols = regras_financeiras.get('mapeamento_colunas', {})
        # Mapeamento para nomes internos
        inv_map = {
            map_cols.get('inspecao'): 'ID_Inspecao',
            map_cols.get('tecnico'): 'NOME_TECNICO',
            map_cols.get('infracao'): 'INFRACAO',
            map_cols.get('data'): 'DATA_AUDITORIA',
            map_cols.get('estado'): 'Estado',
            map_cols.get('cidade'): 'Cidade'
        }
        inv_map = {k: v for k, v in inv_map.items() if k is not None}
        df_bruto.rename(columns=inv_map, inplace=True)
            
        # Validar colunas
        for col in colunas_obrigatorias:
            if col not in df_bruto.columns:
                raise ValueError(f"A coluna obrigatória '{col}' está ausente na planilha.")

        if 'DATA_AUDITORIA' in df_bruto.columns:
            df_bruto['DATA_AUDITORIA'] = parse_excel_dates(df_bruto['DATA_AUDITORIA'])
            df_bruto['Mes_Referencia'] = df_bruto['DATA_AUDITORIA'].dt.strftime('%m/%Y')
        else:
            df_bruto['Mes_Referencia'] = 'Desconhecido'

        if 'Estado' not in df_bruto.columns:
            df_bruto['Estado'] = 'Desconhecido'
        if 'Cidade' not in df_bruto.columns:
            df_bruto['Cidade'] = 'Desconhecido'

        tabela_multas = regras_financeiras.get('tabela_multas_rnc', {})
        
        # Filtrar apenas as linhas onde a infração está na tabela de multas
        df_bruto['Valor_Desconto_RS'] = df_bruto['INFRACAO'].map(tabela_multas)
        
        # Remover nulos (infrações que não existem na tabela ou não aplicáveis)
        penalizacoes = df_bruto.dropna(subset=['Valor_Desconto_RS']).copy()
        
        # Arredondar para duas casas decimais
        penalizacoes['Valor_Desconto_RS'] = penalizacoes['Valor_Desconto_RS'].round(2)
        
        if not penalizacoes.empty:
            penalizacoes['Tabela_Origem'] = tabela_nome
            penalizacoes.to_sql('resultado_financeiro', engine, schema='importador', if_exists='append', index=False)

        resultado = {
            "status": "sucesso",
            "kpis": {
                "total_inspecoes": len(df_bruto),
                "total_multas_aplicadas": len(penalizacoes),
                "impacto_financeiro_total": penalizacoes['Valor_Desconto_RS'].sum() if not penalizacoes.empty else 0.0
            },
            "tabela_saida": "resultado_financeiro"
        }
        print(json.dumps(resultado))

    except Exception as e:
        print(json.dumps({"status": "erro", "mensagem": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        aplicar_multas_anexo07(sys.argv[1])
    else:
        print(json.dumps({"status": "erro", "mensagem": "Parâmetros insuficientes. Forneça o caminho do arquivo."}))
