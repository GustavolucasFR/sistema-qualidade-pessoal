# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


🛡️ Sistema de Qualidade e Auditoria de SLAs (MVP)

Um pipeline de dados End-to-End (E2E) construído para auditar operações de campo, processar regras complexas de qualidade (Anexo 09 - Telefónica/Vivo) e exibir painéis gerenciais em tempo real.

Este MVP foi arquitetado sem a dependência de bancos de dados relacionais (SQL) no primeiro momento, utilizando um sistema de arquivos estruturado para garantir alta performance e integração nativa tanto com aplicações Web (React) quanto com ferramentas de Business Intelligence (Power BI).

🏗️ Arquitetura do Sistema

O sistema é dividido em três camadas principais:

Motor Analítico (Python / Pandas):

Processamento pesado de dados a partir de planilhas Excel (.xlsx).

Aplicação de regras complexas de negócio (Parada de Relógio, Feriados Nacionais, Cruzamento de Histórico de Clientes).

Saída estruturada em .csv limpo.

Servidor API (Node.js / Express):

Atua como um orquestrador e servidor leve.

Lê os logs de penalizações processados pelo Python e os serve dinamicamente como uma API REST em formato JSON.

Frontend Gerencial (React / Vite):

Dashboard interativo e responsivo.

Consome a API do Node.js em tempo real para exibir KPIs de qualidade, top ofensores e logs detalhados.

⚙️ Regras de Negócio Implementadas (Anexo 09)

O Motor Python valida automaticamente:

IRR 30 Dias (Reincidência): Identifica se o mesmo cliente abriu um reparo no intervalo de 30 dias.

IFI 15 Dias (Falha de Instalação): Cruza tabelas de Instalação e Reparo para punir técnicos que deixaram falhas logo após ativar o cliente.

SLA de Reparo (Parada de Relógio): Calcula o tempo real de atendimento descontando madrugadas, finais de semana e feriados (SLA de 8h úteis para clientes B2B).

📂 Estrutura de Diretórios

sistema-qualidade/
│
├── analytics/                 # Motor Python
│   ├── motor_regras.py        # Core de processamento de SLAs
│   ├── calculo_sla.py         # Módulo de fuso e feriados (Parada de relógio)
│   ├── regras_config.json     # Metas dinâmicas do Anexo 09
│   └── venv/                  # Ambiente virtual Python
│
├── backend/                   # Servidor Node.js
│   ├── src/
│   │   ├── app.js             # Orquestrador (Chama o Python via terminal)
│   │   └── server.js          # API REST Express (Porta 3000)
│   └── package.json           
│
├── dados/                     # "Database" em formato de Arquivos
│   ├── 1_uploads_brutos/      # Entrada (.xlsx)
│   ├── 2_dados_consolidados/  # Saída (.csv) -> Consumido pelo PowerBI e Node
│   └── 3_relatorios_pdf/      # Saída de laudos
│
└── frontend/                  # Dashboard React (Vite)
    ├── src/
    │   ├── DashboardOperacional.jsx # Interface Principal
    │   └── main.jsx
    └── package.json


🚀 Como Inicializar o Projeto (Guia Rápido)

1. Inicializar o Servidor API (Backend)

Abra um terminal, navegue até a pasta do backend e inicie o servidor na porta 3000:

cd backend
npm install
node src/server.js


2. Inicializar o Dashboard (Frontend)

Abra outro terminal, navegue até a pasta do frontend e inicie a interface na porta 5173:

cd frontend
npm install
npm run dev


3. Rodar a Auditoria (Motor Python)

Sempre que uma nova planilha for colocada na pasta dados/1_uploads_brutos, você pode rodar o orquestrador para recalcular as penalizações:

cd backend/src
node app.js


(Após rodar, basta clicar no botão "Atualizar" no seu Dashboard React para ver os novos infratores).

Desenvolvido para a equipe de qualidade e auditoria técnica.