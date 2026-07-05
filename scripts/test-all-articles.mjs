const base = await fetch('http://localhost:3456/data/articles.json').then(r => r.json());
const pub = base.filter(a => a.status === 'pub');
let ok = 0;
for (const a of pub) {
  const found = base.find(x => String(x.id) === String(a.id));
  if (found && found.status === 'pub') ok++;
}
console.log(`OK: ${ok}/${pub.length} artigos publicados encontrados no JSON`);
if (ok !== pub.length) process.exit(1);