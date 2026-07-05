-- Config opcional para sync automático GitHub (token com permissão repo)
-- Execute no SQL Editor do Supabase e insira o token:
-- UPDATE publish_config SET github_token = 'ghp_...' WHERE id = 1;

CREATE TABLE IF NOT EXISTS publish_config (
  id            INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  github_token  TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO publish_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE publish_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "publish_config_admin_read" ON publish_config;
CREATE POLICY "publish_config_admin_read" ON publish_config
  FOR SELECT TO authenticated USING (true);