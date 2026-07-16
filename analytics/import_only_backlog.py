import pandas as pd
from sqlalchemy import create_engine, text

def clean_column_names(df):
    if df.columns.empty: return df
    new_cols = []
    seen = {}
    for col in df.columns:
        base_name = "coluna_desconhecida" if pd.isna(col) else str(col).strip().replace("\n", " ")
        if base_name in seen:
            seen[base_name] += 1
            final_name = f"{base_name}_{seen[base_name]}"
        else:
            seen[base_name] = 1
            final_name = base_name
        new_cols.append(final_name)
    df.columns = new_cols
    return df

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
folder_path = 'c:/Users/TECNOMULTI/sistema-qualidade/dados/1_uploads_brutos/'

# Encontrar o arquivo BackLogDiario mais recente
import glob
import os
folder_downloads = 'c:/Users/TECNOMULTI/Downloads/'
list_of_files = glob.glob(os.path.join(folder_path, 'BackLogDiario*.csv')) + glob.glob(os.path.join(folder_downloads, 'BackLogDiario*.csv'))
if not list_of_files:
    print("Nenhum arquivo BackLogDiario*.csv encontrado!")
    exit(1)
file_path = max(list_of_files, key=os.path.getctime)

print(f"Lendo CSV do Backlog: {os.path.basename(file_path)}")
# Get headers from old file
headers = "COD_SS;STATUS;STATUS_REASON;DATA_STATUS;ARMARIO;STREETNAME;STATEORPROVINCE;POSTCODE;CNL;NEIGHBORDHOOD;CATEGORIZES_TYPE;SPECIFICATION_TYPE;SPECIFICATION_PRODUCT;DETAIL;DATA_ABERTURA;DATA_VENCIMENTO;TIME_SLOT;PHYSICALRESOURCESUMMARY;TELEPHONENUMERIC;DESIGNATOR;CITY;CLUSTER_;FABRICA;REGIONAL;CUSTOMER_DOCUMENTNUMERIC;CUSTOMER_NAME;EXECUTEDBYLOGIN;EXECUTEDBYNAME;NOTDONEREASON;PRIORITY;SCHEDULEPROFILE;CUSTOMER_SEGMENT;DATA_AGENDADA;REDESPACHO;CONTEXTO_SIEBEL;TOTAL_REPETIDO_30D_PL;TECNICO_CHECKLIST;SERVICE_TECHNOLOGY;VELOCIDADEADSL;REPETIDO_PRODUTO_30D;REGISTRADO_CHECKLIST;CUSTOMER_RANK;SEGMENTACAO;DESIGNADOR_TV;REDE;MICROAREA;TELEPHONIC_AREA;CENTRAL_OFFICE;PHYSICAL_LINK_MEDIA_TYPE;FLAG_RECENTE;EXECUTOR_BA;TEC_ANTERIOR;PRIMEIRO_AGENDAMENTO;CABO_PRIMARIO;PAR_PRIMARIO;CABO_SECUNDARIO;PAR_SECUNDARIO;LATERAL_PRIMARIO;LATERAL;NUMERO_CAIXA;NOME_MSAN;NP;DATA_CARGA;DATA_LAST_UPDATE_PLWO;ID_FIBRA;OLT;OLT_PORTA;OLT_SLOT;SPLITTER_FIBRA_L2;ORIGEM_CONTATO;ABERTURA_TIPO2_SIEBEL;LATITUDE;LONGITUDE;CLIENTE_GOAS;MARCACAO_VIA_CHAT;PLATFORM;IND_CRITICOS;IND_DISPONIBILIDADE_FIBRA;SAS_BUSINESSID;SAS_STATUSREASON;SASEVEN_CODE;SASEVEN_VIVO1_ID;SASEVEN_DATA_INICIO;SASEVEN_FLAG_ATIVO;SASEVEN_DATA_PREVISAO;SASEVEN_DATA_FECHAMENTO;SASEVEN_LEVEL;SASEVEN_CREATOR;SASCAUSA_NOME;XA_FAULT_REASON;XA_OPERATOR_ID;XA_API_CANCEL_REASON;NOM_SISTEMA_ORIGEM;FLAG_ICMCOE;DESIGNADOR_ACESSO;FLAG_CASAINTELIGENTE;PARENT1;PARENT2;PARENT3;PARENT4;AURA_CASO;AURA_DAT_ENVIO;AURA_DAT_CONF;AURA_RETORNO;IFI;IFI_GERADOR;IRR;IRR_GERADOR;FL_COBERTURA;FL_DISPONIBILIDADE;FL_22K;FLAG_ANATEL;ID_MASSIVA;ID_ORIGEM_MASSIVA;STATUS_MASSIVA;STATUS_CERT_CE;STATUS_CERTIFICACAO_QUALIDADE;V_SEM_TESTE;STATUS_AURA;RESPOSTA_AURA;V_PRAZO_ENCERRAMENTO_CO;V_PRAZO_CERTIFICACAO_GERAL;AGING_ENVIO_COE_ENCERRAR;AGING_FIM_DESASSOCIACAO;STATUS_CIRE;RESULTADO_TESTE_AUTH_TI;RESULTADO_TESTE_SYNC_TI;DATA_PROCESSAMENTO_REPARO;DATA_ENCOUCANC_MASSIVA;DATA_ENVIO_AURA;DATA_RESPOSTA_AURA;DATA_STATUS_CIRE;DATA_DISPARO_TESTE_TI;DATA_COLETA_TESTE_TI;DATA_ENVIO_COE_ENCERRAR;DATA_DESASSOCIACAO;FLAG_FOI_DESASSOCIADO;IND_PASSAGEM_OUVIDORIA".split(";")

with open(file_path, 'r', encoding='latin1') as f:
    first_line = f.readline()
delimiter = '|' if '|' in first_line else ';'
df = pd.read_csv(file_path, sep=delimiter, encoding='latin1', on_bad_lines='skip', skiprows=1, names=headers)
df = clean_column_names(df)

print("Salvando backup da tabela no historico...")
try:
    df.to_sql('backlogdiario_historico', engine, schema='importador', if_exists='append', index=False)
except Exception as e:
    print("Aviso ao inserir no historico (primeira vez?):", e)

print("Inserindo no BD (REPLACE a tabela atual)...")
df.to_sql('backlogdiario', engine, schema='importador', if_exists='replace', index=False)

print("Limpando a pasta de uploads brutos...")
try:
    for f in list_of_files:
        os.remove(f)
        print(f"Arquivo removido: {os.path.basename(f)}")
except Exception as e:
    print(f"Erro ao limpar arquivos: {e}")

print("Sucesso!")
