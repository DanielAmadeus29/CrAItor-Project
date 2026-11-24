-- CrAItor database schema
-- Apply with: psql -h <host> -p <port> -U <user> -d craitors_db -f backend/schema.sql
-- Safe to re-run: existing tables are left untouched.

CREATE TABLE IF NOT EXISTS users (
  id                 SERIAL PRIMARY KEY,
  full_name          VARCHAR(255) NOT NULL,
  username           VARCHAR(100) NOT NULL UNIQUE,
  email              VARCHAR(255) NOT NULL UNIQUE,
  password           VARCHAR(255) NOT NULL,          -- bcrypt hash
  role               VARCHAR(50)  NOT NULL DEFAULT 'Creator',
  instagram_username VARCHAR(100),
  created_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username      VARCHAR(100) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  image_url     TEXT,
  category      VARCHAR(100),
  user_category VARCHAR(100),
  ai_tags       JSONB,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
