-- ═══════════════════════════════════════════════════════════════
-- Pains Acontece — Schema Supabase
-- Execute no SQL Editor do seu projeto: supabase.com → SQL → New query
-- ═══════════════════════════════════════════════════════════════

-- Artigos
CREATE TABLE IF NOT EXISTS articles (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  lead          TEXT,
  content       TEXT,
  cat           TEXT DEFAULT 'Pains',
  status        TEXT DEFAULT 'draft' CHECK (status IN ('pub', 'draft', 'review')),
  img           TEXT,
  video         TEXT,
  source_url    TEXT,
  pub_iso       TIMESTAMPTZ,
  quick_lead    TEXT,
  deep_verified BOOLEAN DEFAULT false,
  world         BOOLEAN DEFAULT false,
  sponsored     BOOLEAN DEFAULT false,
  author        TEXT DEFAULT 'Redação Pains Acontece',
  date          TEXT,
  time_ago      TEXT,
  views         INTEGER DEFAULT 0,
  verified      BOOLEAN DEFAULT false,
  confidence    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Notícias pendentes (IA Scanner)
CREATE TABLE IF NOT EXISTS pending_articles (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  lead          TEXT,
  content       TEXT,
  cat           TEXT,
  img           TEXT,
  author        TEXT DEFAULT 'IA Pains Acontece',
  verified      BOOLEAN DEFAULT false,
  confidence    INTEGER DEFAULT 0,
  source        TEXT,
  source_url    TEXT,
  region        TEXT,
  found_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Estado do scanner (linha única)
CREATE TABLE IF NOT EXISTS scanner_state (
  id                INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_scan         TIMESTAMPTZ,
  interval_minutes  INTEGER DEFAULT 5,
  seen_urls         JSONB DEFAULT '[]'::jsonb
);

-- Eventos da agenda
CREATE TABLE IF NOT EXISTS events (
  id      BIGSERIAL PRIMARY KEY,
  title   TEXT NOT NULL,
  date    TEXT,
  time    TEXT,
  place   TEXT,
  active  BOOLEAN DEFAULT true
);

-- Vagas de emprego
CREATE TABLE IF NOT EXISTS jobs (
  id       BIGSERIAL PRIMARY KEY,
  title    TEXT NOT NULL,
  type     TEXT,
  company  TEXT,
  active   BOOLEAN DEFAULT true
);

-- Pautas enviadas pelo público
CREATE TABLE IF NOT EXISTS pautas (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT,
  email      TEXT,
  phone      TEXT,
  message    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_cat ON articles(cat);
CREATE INDEX IF NOT EXISTS idx_pending_found ON pending_articles(found_at DESC);

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_updated_at ON articles;
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Incrementar visualizações (público)
CREATE OR REPLACE FUNCTION increment_article_views(article_id BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_views INTEGER;
BEGIN
  UPDATE articles SET views = views + 1 WHERE id = article_id RETURNING views INTO new_views;
  RETURN COALESCE(new_views, 0);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scanner_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pautas ENABLE ROW LEVEL SECURITY;

-- Artigos: público lê apenas publicados
CREATE POLICY "artigos_publicos" ON articles
  FOR SELECT TO anon USING (status = 'pub');

CREATE POLICY "artigos_admin_select" ON articles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "artigos_admin_insert" ON articles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "artigos_admin_update" ON articles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "artigos_admin_delete" ON articles
  FOR DELETE TO authenticated USING (true);

-- Pendentes: só admin autenticado
CREATE POLICY "pending_admin_all" ON pending_articles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Scanner: só admin
CREATE POLICY "scanner_admin_all" ON scanner_state
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Eventos e empregos: leitura pública
CREATE POLICY "events_public_read" ON events
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE POLICY "events_admin_all" ON events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "jobs_public_read" ON jobs
  FOR SELECT TO anon, authenticated USING (active = true);

CREATE POLICY "jobs_admin_all" ON jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Pautas: qualquer um envia, admin lê
CREATE POLICY "pautas_public_insert" ON pautas
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "pautas_admin_read" ON pautas
  FOR SELECT TO authenticated USING (true);

-- Permissões da função de views
GRANT EXECUTE ON FUNCTION increment_article_views(BIGINT) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- Inicialização (banco vazio — publique do zero pelo painel)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO scanner_state (id, interval_minutes, seen_urls)
VALUES (1, 5, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;