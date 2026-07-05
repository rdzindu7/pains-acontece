-- Execute no SQL Editor do Supabase se inserts de artigos falharem
-- Adiciona colunas usadas pelo painel e pela IA

ALTER TABLE articles ADD COLUMN IF NOT EXISTS video TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS pub_iso TIMESTAMPTZ;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS quick_lead TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deep_verified BOOLEAN DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS world BOOLEAN DEFAULT false;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS sponsored BOOLEAN DEFAULT false;