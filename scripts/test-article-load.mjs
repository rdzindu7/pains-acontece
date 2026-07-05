/** Testa carregamento de artigo via fetch direto ao JSON */
const id = '1783232923301';
const base = await fetch('http://localhost:3456/data/articles.json').then(r => r.json());
const art = base.find(a => String(a.id) === id);
if (!art) {
  console.error('FAIL: artigo não encontrado no JSON');
  process.exit(1);
}
if (art.status !== 'pub') {
  console.error('FAIL: status não é pub:', art.status);
  process.exit(1);
}
console.log('OK:', art.title.slice(0, 60) + '…');