
# 🛡️ Sistema de Qualidade e Auditoria de SLAs (MVP)

Um pipeline de dados End-to-End (E2E) construído para auditar operações de campo, processar regras complexas de qualidade (Anexo 09 - Telefónica/Vivo) e exibir painéis gerenciais em tempo real.

Este sistema foi arquitetado utilizando PostgreSQL como banco de dados principal, integrado a um motor analítico em Python para processamento de dados massivos e um backend Node.js, garantindo alta performance e integração nativa tanto com aplicações Web (React) quanto com ferramentas de Business Intelligence (Power BI).

## 🏗️ Arquitetura do Sistema

O sistema é dividido em três camadas principais:

**Motor Analítico (Python / Pandas / SQLAlchemy):**
- Processamento pesado de dados a partir do banco PostgreSQL.
- Aplicação de regras complexas de negócio (Parada de Relógio, Feriados Nacionais, Cruzamento de Histórico de Clientes).
- Integração de dados persistidos no PostgreSQL (Schema `importador`).

**Servidor API (Node.js / Express / pg):**
- Atua como um orquestrador e servidor leve.
- Lê os logs e resultados processados diretamente do PostgreSQL e os serve dinamicamente como uma API REST em formato JSON.

**Banco de Dados (PostgreSQL):**
- Responsável por armazenar toda a base de dados em tabelas (ex: logs brutos e resultados analíticos).
- Estrutura otimizada para queries em tempo real pelo Node.js.

**Frontend Gerencial (React / Vite):**
- Dashboard interativo e responsivo.
- Consome a API do Node.js em tempo real para exibir KPIs de qualidade, top ofensores e logs detalhados.

## ⚙️ Regras de Negócio Implementadas (Anexo 09)

O Motor Python valida automaticamente:
- **IRR 30 Dias (Reincidência):** Identifica se o mesmo cliente abriu um reparo no intervalo de 30 dias.
- **IFI 15 Dias (Falha de Instalação):** Cruza tabelas de Instalação e Reparo para punir técnicos que deixaram falhas logo após ativar o cliente.
- **SLA de Reparo (Parada de Relógio):** Calcula o tempo real de atendimento descontando madrugadas, finais de semana e feriados (SLA de 8h úteis para clientes B2B).

## 📂 Estrutura de Diretórios

```text
sistema-qualidade/
│
├── analytics/                 # Motor Python
│   ├── motor_irr_pg.py        # Processamento de Reincidência (PostgreSQL)
│   ├── motor_slas_pg.py       # Processamento de SLAs (PostgreSQL)
│   ├── regras_config.json     # Metas dinâmicas do Anexo 09
│   └── venv/                  # Ambiente virtual Python
│
├── backend/                   # Servidor Node.js
│   ├── src/
│   │   ├── db.js              # Conexão com o Banco de Dados (Pool PG)
│   │   ├── orquestrador.js    # Orquestrador de tarefas e scripts
│   │   └── server.js          # API REST Express (Porta 3000)
│   └── package.json           
│
├── dados/                     # Diretório de arquivos auxiliares/uploads
│   ├── 1_uploads_brutos/      # Entrada para ingestão de planilhas
│   ├── 2_dados_consolidados/  # Saídas em lote e planilhas processadas
│   └── 3_relatorios_pdf/      # Saída de laudos em PDF
│
└── frontend/                  # Dashboard React (Vite)
    ├── src/
    │   ├── components/
    │   │   └── DashboardOperacional.jsx # Interface Principal
    │   └── main.jsx
    └── package.json
```

## 🚀 Como Inicializar o Projeto (Guia Rápido)

### 1. Inicializar o Servidor API (Backend)
Abra um terminal, navegue até a pasta do backend e inicie o servidor na porta 3000:
```powershell
cd backend
npm install
node src/server.js
```

### 2. Inicializar o Dashboard (Frontend)
Abra outro terminal, navegue até a pasta do frontend e inicie a interface na porta 5173:
```powershell
cd frontend
npm install
npm run dev
```

### 3. Rodar a Auditoria (Motor Python)
A base de dados é primeiramente carregada no banco PostgreSQL, onde scripts analíticos independentes (ex. `motor_irr_pg.py`) são executados para gerar as não-conformidades. Você pode rodar o processamento (exemplo com o mês 'jun'):
```powershell
cd analytics
python motor_irr_pg.py jun
```

(Após rodar o script, os novos registros são inseridos diretamente no PostgreSQL. O botão "Atualizar" no Dashboard React carregará os novos infratores imediatamente pela API).

---
> *Desenvolvido para a equipe de qualidade e auditoria técnica da Tecnomulti.*
