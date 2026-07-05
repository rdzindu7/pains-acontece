-- Visitas ao portal (contador global)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS site_stats (
  id            INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_visits  BIGINT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_stats (id, total_visits) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION increment_site_visits()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_total BIGINT;
BEGIN
  UPDATE site_stats
  SET total_visits = total_visits + 1, updated_at = NOW()
  WHERE id = 1
  RETURNING total_visits INTO new_total;
  RETURN COALESCE(new_total, 0);
END;
$$;

ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_stats_public_read" ON site_stats;
CREATE POLICY "site_stats_public_read" ON site_stats
  FOR SELECT TO anon, authenticated USING (true);

GRANT EXECUTE ON FUNCTION increment_site_visits() TO anon, authenticated;