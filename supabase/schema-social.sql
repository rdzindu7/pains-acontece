-- ═══════════════════════════════════════════════════════════════
-- Pains Acontece — Schema Social (perfis, comentários, reações, selo)
-- Execute APÓS schema.sql no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- Perfis de leitores (vinculados ao auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  display_name    TEXT DEFAULT 'Leitor',
  avatar_url      TEXT,
  bio             TEXT DEFAULT '',
  location        TEXT DEFAULT '',
  website         TEXT DEFAULT '',
  verified_badge  BOOLEAN DEFAULT false,
  verified_at     TIMESTAMPTZ,
  verified_until  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários em artigos
CREATE TABLE IF NOT EXISTS article_comments (
  id          BIGSERIAL PRIMARY KEY,
  article_id  TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Reações (curtir + emojis)
CREATE TABLE IF NOT EXISTS article_reactions (
  id          BIGSERIAL PRIMARY KEY,
  article_id  TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction    TEXT NOT NULL CHECK (reaction IN ('like', 'love', 'wow', 'sad', 'angry')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (article_id, user_id)
);

-- Solicitações de selo verificado (aprovadas só pelo proprietário)
CREATE TABLE IF NOT EXISTS verified_requests (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message     TEXT,
  plan        TEXT DEFAULT 'anual',
  amount      NUMERIC(10,2) DEFAULT 29.90,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_article ON article_comments(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_article ON article_reactions(article_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified_badge) WHERE verified_badge = true;
CREATE INDEX IF NOT EXISTS idx_verified_status ON verified_requests(status, created_at DESC);

-- Trigger updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS comments_updated_at ON article_comments;
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON article_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Criar perfil automaticamente ao registrar via Google
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_requests ENABLE ROW LEVEL SECURITY;

-- Perfis: leitura pública, edição própria
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "profiles_own_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Comentários
CREATE POLICY "comments_public_read" ON article_comments
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "comments_auth_insert" ON article_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_own_update" ON article_comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "comments_own_delete" ON article_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reações
CREATE POLICY "reactions_public_read" ON article_reactions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "reactions_auth_upsert" ON article_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_own_update" ON article_reactions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "reactions_own_delete" ON article_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Solicitações verificado
CREATE POLICY "verified_own_read" ON verified_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "verified_own_insert" ON verified_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verified_admin_read" ON verified_requests
  FOR SELECT TO authenticated USING (
    (auth.jwt() ->> 'email') = 'admin@painsacontece.com.br'
  );

CREATE POLICY "verified_admin_update" ON verified_requests
  FOR UPDATE TO authenticated USING (
    (auth.jwt() ->> 'email') = 'admin@painsacontece.com.br'
  );