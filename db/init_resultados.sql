CREATE TABLE IF NOT EXISTS importador.resultados_sla (
    id SERIAL PRIMARY KEY,
    competencia VARCHAR(10) NOT NULL,
    tecnico VARCHAR(255) NOT NULL,
    empresa VARCHAR(255),
    id_atividade BIGINT,
    sla_comeco NUMERIC,
    sla_fim NUMERIC,
    termino_real NUMERIC,
    status_sla VARCHAR(50),
    tempo_excedido NUMERIC,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS importador.resultados_irr (
    id SERIAL PRIMARY KEY,
    cliente_id VARCHAR(255) NOT NULL,
    tecnico_instalador VARCHAR(255),
    tecnico_reparo VARCHAR(255),
    data_instalacao TIMESTAMP,
    data_reparo TIMESTAMP,
    dias_diferenca INTEGER,
    status_irr VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS importador.usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default users if they don't exist
INSERT INTO importador.usuarios (username, password, role)
VALUES 
    ('admin', 'admin', 'TI'),
    ('operador', 'operador', 'OPERACAO')
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS importador.planos_acao (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    problema TEXT NOT NULL,
    causa_raiz TEXT,
    acao_proposta TEXT,
    responsavel VARCHAR(255),
    cluster VARCHAR(255),
    kpi_foco VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Aberto',
    prazo DATE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS importador.metas_kpis (
    id SERIAL PRIMARY KEY,
    kpi_nome VARCHAR(100) UNIQUE NOT NULL,
    valor_meta NUMERIC NOT NULL,
    operador VARCHAR(10) NOT NULL, -- e.g. '>=', '<=', '='
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS importador.alertas (
    id SERIAL PRIMARY KEY,
    tipo_alerta VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    severidade VARCHAR(50) DEFAULT 'Media', -- 'Alta', 'Media', 'Baixa'
    cluster VARCHAR(255),
    lido BOOLEAN DEFAULT FALSE,
    data_geracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
