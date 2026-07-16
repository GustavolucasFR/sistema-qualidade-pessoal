-- Criação do usuário de leitura para a IA
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'ai_reader') THEN

      CREATE ROLE ai_reader WITH LOGIN PASSWORD 'ai_reader_123';
   END IF;
END
$do$;

-- Concede conexão ao banco de dados postgres
GRANT CONNECT ON DATABASE postgres TO ai_reader;

-- Concede uso nos schemas
GRANT USAGE ON SCHEMA public TO ai_reader;
GRANT USAGE ON SCHEMA importador TO ai_reader;

-- Concede permissão de SELECT nas tabelas atuais dos schemas
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA importador TO ai_reader;

-- Garante que o ai_reader também tenha SELECT em tabelas criadas no futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ai_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA importador GRANT SELECT ON TABLES TO ai_reader;
