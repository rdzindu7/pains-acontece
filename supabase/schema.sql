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
  interval_minutes  INTEGER DEFAULT 20,
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
-- Dados iniciais (seed)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO scanner_state (id, interval_minutes, seen_urls)
VALUES (1, 20, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO articles (id, title, lead, content, cat, status, img, author, date, time_ago, views, verified, confidence) VALUES
(1, 'UBS de Pains amplia atendimento com novos serviços especializados',
 'Unidade passa a oferecer consultas em cardiologia e dermatologia para moradores da cidade e região.',
 '<p>A Unidade Básica de Saúde (UBS) de Pains ampliou sua grade de atendimentos nesta semana, passando a oferecer consultas especializadas em cardiologia e dermatologia para a população local.</p><p>Segundo a Secretaria Municipal de Saúde, a medida visa reduzir o deslocamento de pacientes para Formiga e outras cidades da região do Alto São Francisco.</p><p>O horário de atendimento permanece de segunda a sexta, das 7h às 17h.</p>',
 'Saúde', 'pub', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
 'Redação Pains Acontece', '04/07/2026', 'Há 1 hora', 523, true, 95),
(2, 'Festival de inverno movimenta comércio em Pains',
 'Evento cultural na praça central atrai visitantes de toda a microrregião neste fim de semana.',
 '<p>O Festival de Inverno de Pains começou nesta sexta-feira com programação gratuita na praça central, reunindo artesanato, gastronomia típica e apresentações musicais.</p><p>Comerciantes locais relatam aumento no movimento e expectativa de boa temporada.</p>',
 'Agenda', 'pub', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
 'Redação Pains Acontece', '04/07/2026', 'Há 2 horas', 891, true, 88),
(3, 'Sine regional abre 30 vagas para moradores de Pains',
 'Oportunidades em comércio, indústria e serviços estão disponíveis para candidatos da região.',
 '<p>O Sistema Nacional de Emprego (Sine) da região divulgou 30 novas vagas de trabalho com preferência para moradores de Pains e cidades vizinhas.</p><p>Os interessados devem comparecer ao posto do Sine com documentação completa.</p>',
 'Empregos', 'pub', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
 'Redação Pains Acontece', '04/07/2026', 'Há 6 horas', 2240, true, 90),
(4, 'Câmara vota projeto de apoio ao comércio local',
 'Proposta prevê isenção temporária de taxas para pequenos empresários do município.',
 '<p>A Câmara Municipal de Pains colocou em pauta o projeto de lei que prevê apoio ao comércio local.</p>',
 'Política', 'draft', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80',
 'Redação Pains Acontece', '03/07/2026', 'Há 1 dia', 0, false, 60),
(5, 'Alerta dengue: casos sobem 40% na microrregião',
 'Secretarias de saúde intensificam campanhas de prevenção em Pains e cidades vizinhas.',
 '<p>As secretarias de saúde da microrregião registraram aumento de 40% nos casos de dengue nos últimos 30 dias.</p>',
 'Saúde', 'review', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
 'Redação Pains Acontece', '03/07/2026', 'Em revisão', 0, true, 82),
(6, 'Prefeitura de Pains investe em pavimentação de vias do centro',
 'Obra beneficia moradores e comerciantes da área central da cidade.',
 '<p>A Prefeitura de Pains iniciou obras de pavimentação em vias do centro da cidade, com previsão de conclusão em 60 dias.</p>',
 'Pains', 'pub', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
 'Redação Pains Acontece', '02/07/2026', 'Há 2 dias', 1150, true, 85)
ON CONFLICT (id) DO NOTHING;

SELECT setval('articles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM articles));

INSERT INTO events (id, title, date, time, place, active) VALUES
(1, 'Sessão Ordinária da Câmara Municipal', '05 Jul', '18h', 'Câmara de Pains', true),
(2, 'Mutirão de Saúde – Exames Gratuitos', '07 Jul', '08h', 'UBS Central', true),
(3, 'Festival Gastronômico de Inverno', '12 Jul', '17h', 'Praça Central', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('events_id_seq', (SELECT COALESCE(MAX(id), 1) FROM events));

INSERT INTO jobs (id, title, type, company, active) VALUES
(1, 'Auxiliar Administrativo', 'CLT', 'Comércio Local', true),
(2, 'Operador de Máquinas', 'CLT', 'Ind. Regional', true),
(3, 'Técnico em Enfermagem', 'CLT', 'Santa Casa', true)
ON CONFLICT (id) DO NOTHING;

SELECT setval('jobs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM jobs));