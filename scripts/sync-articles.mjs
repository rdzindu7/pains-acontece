/**
 * Sincroniza artigos publicados do Supabase → data/articles.json
 * Uso: node scripts/sync-articles.mjs
 * Variáveis opcionais: SUPABASE_URL, SUPABASE_ANON_KEY
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT = join(ROOT, 'data', 'articles.json');
const CONFIG = join(ROOT, 'js', 'core', 'config.js');

function readConfig() {
  const envUrl = process.env.SUPABASE_URL?.trim();
  const envKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (envUrl && envKey) return { url: envUrl, key: envKey };
  const raw = readFileSync(CONFIG, 'utf8');
  const url = raw.match(/supabaseUrl:\s*['"]([^'"]+)['"]/)?.[1]?.trim();
  const key = raw.match(/supabaseAnonKey:\s*['"]([^'"]+)['"]/)?.[1]?.trim();
  if (!url || !key || url.includes('SUA_URL') || key.includes('SUA_CHAVE')) {
    throw new Error('Supabase não configurado em js/core/config.js');
  }
  return { url, key };
}

function rowToArticle(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    lead: row.lead,
    content: row.content,
    cat: row.cat,
    status: row.status,
    img: row.img,
    video: row.video,
    author: row.author,
    date: row.date,
    timeAgo: row.time_ago,
    views: row.views ?? 0,
    verified: row.verified,
    confidence: row.confidence,
    deepVerified: row.deep_verified ?? row.deepVerified,
    source_url: row.source_url,
    quickLead: row.quick_lead ?? row.quickLead,
    pubISO: row.pub_iso ?? row.pubISO,
    world: row.world ?? false,
    sponsored: row.sponsored ?? false
  };
}

async function fetchPublished(url, key) {
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/articles?status=eq.pub&select=*&order=id.desc`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()).map(rowToArticle).filter(Boolean);
}

async function main() {
  const { url, key } = readConfig();
  console.log('Sincronizando artigos publicados do Supabase…');
  const articles = await fetchPublished(url, key);
  let existing = [];
  try { existing = JSON.parse(readFileSync(OUT, 'utf8')); } catch {}
  if (!articles.length && existing.length) {
    console.log(`⚠ Supabase vazio — mantendo ${existing.length} artigo(s) em articles.json`);
    return existing.length;
  }
  writeFileSync(OUT, JSON.stringify(articles, null, 2) + '\n', 'utf8');
  console.log(`✓ ${articles.length} artigo(s) → data/articles.json`);
  return articles.length;
}

main().catch(err => {
  console.error('ERRO sync:', err.message);
  process.exit(1);
});