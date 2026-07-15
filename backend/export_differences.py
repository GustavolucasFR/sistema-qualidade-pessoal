import pandas as pd
import psycopg2

# 1. Carregar a planilha Zeus original (para obtermos os valores que a BA calculou)
file_path = r'c:\Users\TECNOMULTI\sistema-qualidade\dados\2_dados_consolidados\ProducaoBA.xlsb'

try:
    df = pd.read_excel(file_path, engine='pyxlsb', sheet_name='Zeus')
    
    # Filter for TECNOMULTI and status Concluído
    df = df[df['Empresa'].str.contains('TECNOMULTI', na=False, case=False)]
    df = df[df['Status'].str.startswith('Conclu', na=False)]
    
    date_col = [col for col in df.columns if 'Data Agendada' in col][0]
    os_col = [col for col in df.columns if 'Ordem de Servi' in col][0]
    
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce', origin='1899-12-30', unit='D')
    df_filtered = df[(df[date_col] >= '2026-06-21') & (df[date_col] <= '2026-07-07')]
    
    excel_os_totals = df_filtered.groupby(os_col)['Receita Total'].sum().to_dict()
    excel_os_types = df_filtered.groupby(os_col)['Tipo de Atividade'].first().to_dict()
    
    conn = psycopg2.connect("dbname='postgres' user='postgres' host='localhost' password='postgres'")
    cur = conn.cursor()
    
    query = """
      SELECT 
          pd.n_mero_da_ordem_de_servi_o as os,
          SUM(COALESCE(r.receita_vivo, 0) + COALESCE(r.receita_fibrasil, 0)) as db_receita,
          MAX(pd.tipo_de_atividade) as ativ
      FROM importador.zeus_consolidado pd
      LEFT JOIN importador.regras_receita r ON UPPER(TRIM(r.chave)) = UPPER(
          TRIM(pd.tipo_de_atividade) || 
          TRIM(pd.estado) || 
          TRIM(pd.tecnologia) || 
          CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
          CASE 
            WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'não' THEN 'Não' 
            WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
            ELSE '-' 
          END
      )
      WHERE pd.cidade IS NOT NULL AND TRIM(pd.cidade) != '' AND TRIM(pd.cidade) != '-' 
        AND UPPER(TRIM(pd.empresa)) = 'TECNOMULTI'
        AND pd.data_agendada_para_execu__o::date >= '2026-06-21'
        AND pd.data_agendada_para_execu__o::date <= '2026-07-07'
        AND (pd.status ILIKE 'Conclu%')
      GROUP BY pd.n_mero_da_ordem_de_servi_o
    """
    cur.execute(query)
    db_rows = cur.fetchall()
    
    db_os_totals = {row[0]: float(row[1] or 0) for row in db_rows}
    db_os_ativ = {row[0]: row[2] for row in db_rows}
    
    differences = []
    
    for os_num, db_val in db_os_totals.items():
        ex_val = excel_os_totals.get(os_num, 0)
        if abs(db_val - ex_val) > 0.01:
            t = excel_os_types.get(os_num, db_os_ativ.get(os_num, 'Unknown'))
            differences.append({
                'os': os_num,
                'atividade': t,
                'excel': ex_val,
                'banco': db_val,
                'diferenca': db_val - ex_val
            })
    
    # Sort by absolute difference
    differences.sort(key=lambda x: x['diferenca'], reverse=True)
    
    import json
    with open('differences.json', 'w') as f:
        json.dump(differences, f)
        
    print("Exported differences.json")
    
except Exception as e:
    import traceback
    traceback.print_exc()
