CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_user_sessions_expire ON user_sessions (expire);

-- Senha padrão do usuário seed: admin123456
INSERT INTO users (nome, email, password_hash, role)
VALUES (
  'Administrador',
  'admin@labfinance.com',
  '3b480a7fda0149c2c7bdbdb6be019828:93691983e2dde5812e078e74386516839956e142ade56996f9c478ff3b375cfb3dc5bfd82fc086fc196d6f6adf3321009b0d62c244d97d28275da1cdbcb2a999',
  'admin'
)
ON CONFLICT (email) DO NOTHING;
