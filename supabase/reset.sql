-- ═══════════════════════════════════════════════════════════════
-- Pains Acontece — Zerar todos os dados (mantém estrutura)
-- Execute no SQL Editor do Supabase quando quiser começar do zero
-- ═══════════════════════════════════════════════════════════════

TRUNCATE TABLE pending_articles CASCADE;
TRUNCATE TABLE pautas CASCADE;
TRUNCATE TABLE articles RESTART IDENTITY CASCADE;
TRUNCATE TABLE events RESTART IDENTITY CASCADE;
TRUNCATE TABLE jobs RESTART IDENTITY CASCADE;

UPDATE scanner_state
SET last_scan = NULL, seen_urls = '[]'::jsonb, interval_minutes = 5
WHERE id = 1;

INSERT INTO scanner_state (id, interval_minutes, seen_urls)
VALUES (1, 5, '[]'::jsonb)
ON CONFLICT (id) DO UPDATE
SET last_scan = NULL, seen_urls = '[]'::jsonb, interval_minutes = 5;