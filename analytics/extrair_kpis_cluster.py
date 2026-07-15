import os
import pandas as pd
import json

base_dir = os.path.dirname(__file__)
consolidados_dir = os.path.abspath(os.path.join(base_dir, '..', 'dados', '2_dados_consolidados'))

# Mapeamento fornecido pelo usuário
mapping = {
    'CABEDELO': 'JOAO PESSOA',
    'CAMPINA GRANDE': 'JOAO PESSOA',
    'CARUARU': 'CARUARU',
    'GARANHUNS': 'CARUARU',
    'JABOATAO DOS GUARARAPES': 'RECIFE',
    'JOAO PESSOA': 'JOAO PESSOA',
    'MOSSORO': 'NATAL',
    'NATAL': 'NATAL',
    'PARNAMIRIM': 'NATAL',
    'PATOS': 'JOAO PESSOA',
    'RECIFE': 'RECIFE'
}

kpis = {}

try:
    # Lendo Eficiência (Eficiência.xlsb)
    # Tem cabeçalho estranho, então lemos e procuramos a linha
    df_ef = pd.read_excel(os.path.join(consolidados_dir, 'Eficiência.xlsb'), engine='pyxlsb', header=None)
    
    # As cidades estão na coluna 1, clusters na 2, eficiência na 5 (índices)
    for i in range(len(df_ef)):
        row = df_ef.iloc[i]
        cidade = str(row[1]).strip().upper()
        if cidade in mapping:
            cluster = mapping[cidade]
            if pd.notna(row[5]):
                try:
                    val = float(row[5])
                    if cluster not in kpis:
                        kpis[cluster] = {'eficiencia': [], 'produtividade': []}
                    kpis[cluster]['eficiencia'].append(val)
                except:
                    pass
except Exception as e:
    print("Erro lendo eficiencia:", e)

try:
    df_pr = pd.read_excel(os.path.join(consolidados_dir, 'Consolidado_Produtividade.xlsb'), engine='pyxlsb', header=None, nrows=1000)
    for i in range(len(df_pr)):
        row = df_pr.iloc[i]
        cidade = str(row[1]).strip().upper()
        if cidade in mapping:
            cluster = mapping[cidade]
            if pd.notna(row[19]): # Produtividade aprox
                try:
                    val = float(row[19])
                    if cluster not in kpis:
                        kpis[cluster] = {'eficiencia': [], 'produtividade': []}
                    kpis[cluster]['produtividade'].append(val)
                except:
                    pass
except Exception as e:
    print("Erro lendo produtividade:", e)

# Calcular médias
resultados = {}
for cluster, data in kpis.items():
    ef_avg = sum(data['eficiencia']) / len(data['eficiencia']) if data['eficiencia'] else 0
    pr_avg = sum(data['produtividade']) / len(data['produtividade']) if data['produtividade'] else 0
    resultados[cluster] = {
        'eficiencia': round(ef_avg * 100, 1),
        'produtividade': round(pr_avg * 100, 1)
    }

out_path = os.path.join(consolidados_dir, 'kpis_por_cluster.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(resultados, f, ensure_ascii=False, indent=2)

print("KPIs extraídos para JSON:", resultados)
