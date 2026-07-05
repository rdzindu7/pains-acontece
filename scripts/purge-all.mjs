/**
 * Remove todas as postagens: JSON, imagens e tentativa na nuvem.
 * Uso: node scripts/purge-all.mjs
 */
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'articles.json');
const IMG_DIR = join(ROOT, 'assets', 'images', 'articles');
const CONFIG = join(ROOT, 'js', 'core', 'config.js');

writeFileSync(OUT, '[]\n', 'utf8');
console.log('✓ data/articles.json zerado');

let removed = 0;
for (const f of readdirSync(IMG_DIR)) {
  if (f === '.gitkeep') continue;
  unlinkSync(join(IMG_DIR, f));
  removed++;
}
console.log(`✓ ${removed} imagem(ns) removida(s)`);

try {
  const raw = readFileSync(CONFIG, 'utf8');
  const url = raw.match(/supabaseUrl:\s*'([^']+)'/)?.[1]?.trim();
  const key = raw.match(/supabaseAnonKey:\s*'([^']+)'/)?.[1]?.trim();
  if (url && key && !url.includes('SUA_URL')) {
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const delArts = await fetch(`${url.replace(/\/$/, '')}/rest/v1/articles?id=gte.0`, {
      method: 'DELETE', headers
    });
    const delPending = await fetch(`${url.replace(/\/$/, '')}/rest/v1/pending_articles?id=neq.`, {
      method: 'DELETE', headers
    });
    console.log(`✓ Supabase articles: HTTP ${delArts.status}, pending: HTTP ${delPending.status}`);
  }
} catch (e) {
  console.warn('Supabase:', e.message);
}

console.log('Postagens limpas.');