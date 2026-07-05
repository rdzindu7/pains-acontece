/**
 * Baixa imagens de data/articles.json → assets/images/articles/
 * Remove arquivos órfãos (artigos apagados).
 * Uso: node scripts/process-article-images.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { processArticleImages, pruneArticleImages } from './lib/article-images.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARTICLES = join(ROOT, 'data', 'articles.json');

async function main() {
  let articles = [];
  try {
    articles = JSON.parse(readFileSync(ARTICLES, 'utf8'));
  } catch (e) {
    console.error('articles.json inválido:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(articles)) articles = [];

  console.log(`Processando imagens de ${articles.length} artigo(s)…`);
  const { articles: updated, downloaded } = await processArticleImages(articles, ROOT);
  const { removed } = pruneArticleImages(updated, ROOT);

  writeFileSync(ARTICLES, JSON.stringify(updated, null, 2) + '\n', 'utf8');
  console.log(`✓ ${downloaded} imagem(ns) baixada(s), ${removed} arquivo(s) órfão(s) removido(s)`);
  console.log(`✓ articles.json atualizado com caminhos locais`);
}

main().catch(err => {
  console.error('ERRO:', err.message);
  process.exit(1);
});