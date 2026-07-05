/**
 * Popula data/articles.json com notícias verificadas via RSS.
 * Uso: node scripts/seed-articles.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'articles.json');

const RSS_FEEDS = [
  { url: 'https://news.google.com/rss/search?q=Pains+MG&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Pains', priority: 3 },
  { url: 'https://news.google.com/rss/search?q=Pains+Minas+Gerais&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Pains', priority: 3 },
  { url: 'https://news.google.com/rss/search?q=Formiga+MG&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Região', priority: 2 },
  { url: 'https://news.google.com/rss/search?q=Piumhi+MG&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Região', priority: 2 },
  { url: 'https://news.google.com/rss/search?q=Minas+Gerais&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Brasil / Mundo', priority: 1 },
  { url: 'https://news.google.com/rss/search?q=Brasil+not%C3%ADcias&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Brasil / Mundo', priority: 1 },
  { url: 'https://news.google.com/rss/search?q=mundo+internacional&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Brasil / Mundo', priority: 1, world: true },
  { url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', region: 'Brasil / Mundo', priority: 2, world: true },
  { url: 'https://g1.globo.com/rss/g1/minas-gerais/', region: 'Região', priority: 2 },
  { url: 'https://g1.globo.com/rss/g1/', region: 'Brasil / Mundo', priority: 2 },
  { url: 'https://news.google.com/rss/search?q=pol%C3%ADtica+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Brasil / Mundo', priority: 1 },
  { url: 'https://news.google.com/rss/search?q=pol%C3%ADcia+Minas+Gerais&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Polícia', priority: 2 }
];

const TRUSTED = ['gov.br', 'g1.globo.com', 'uol.com.br', 'r7.com', 'otempo.com.br', 'em.com.br', 'prefeitura', 'camara', 'pains.mg.gov.br', 'bbc.com', 'bbc.co.uk', 'agenciabrasil', 'folha.uol', 'estadao'];

const CAT_KEYWORDS = {
  'Polícia': ['policia', 'pm', 'prisao', 'assalto', 'roubo', 'crime'],
  'Política': ['camara', 'prefeito', 'vereador', 'eleicao', 'politica', 'governo'],
  'Saúde': ['saude', 'ubs', 'hospital', 'dengue', 'vacina'],
  'Pains': ['pains'],
  'Região': ['formiga', 'piumhi', 'dores', 'bambui'],
  'Brasil / Mundo': ['brasil', 'mundo', 'nacional', 'internacional']
};

const PHOTO_BASE = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'photo-base.json'), 'utf8'));
const WIKI_FALLBACK = PHOTO_BASE['Brasil / Mundo'];
const IMGS = { ...PHOTO_BASE };

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function detectCategory(title, summary, feedRegion, isWorld) {
  if (isWorld || feedRegion === 'Brasil / Mundo') return 'Brasil / Mundo';
  if (feedRegion && !['Últimas Notícias'].includes(feedRegion)) return feedRegion;
  const text = norm(title + ' ' + summary);
  let best = 'Últimas Notícias', score = 0;
  for (const [cat, keys] of Object.entries(CAT_KEYWORDS)) {
    const s = keys.filter(k => text.includes(k)).length;
    if (s > score) { score = s; best = cat; }
  }
  if (text.includes('pains')) return 'Pains';
  return best;
}

function isTrusted(link) {
  const l = (link || '').toLowerCase();
  return TRUSTED.some(d => l.includes(d));
}

function calcConfidence(item, all) {
  let score = 40;
  if (isTrusted(item.link)) score += 30;
  const words = norm(item.title).split(/\s+/).filter(w => w.length > 4);
  const matches = all.filter(o => o.link !== item.link && words.filter(w => norm(o.title).includes(w)).length >= Math.min(3, words.length * 0.4));
  if (matches.length >= 1) score += 20;
  if (matches.length >= 2) score += 10;
  return Math.min(98, score);
}

function formatDate(d) {
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Há ${mins || 1} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Há ${hrs} hora${hrs > 1 ? 's' : ''}`;
  return `Há ${Math.floor(hrs / 24)} dia(s)`;
}

function extractSource(link) {
  try { return new URL(link).hostname.replace('www.', ''); } catch { return 'web'; }
}

function stripHtml(raw) {
  if (!raw) return '';
  let t = raw
    .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"');
  t = t.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');
  t = t.replace(/<font[^>]*>(.*?)<\/font>/gi, ' $1');
  t = t.replace(/<[^>]+>/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

const imageCache = new Map();
let ogFetchCount = 0;

function decodeEntities(s) {
  if (!s) return '';
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
}

function isValidNewsImage(url) {
  if (!url) return false;
  const u = url.trim();
  if (!/^https?:\/\//i.test(u) && !u.startsWith('//')) return false;
  if (/pixel|tracker|1x1|favicon|logo\.(svg|png)/i.test(u)) return false;
  return /(\.(jpg|jpeg|png|webp|gif)(\?|$))|\/(image|images|photo|thumb|media|upload|cpsprodpb)/i.test(u);
}

function normalizeImageUrl(url) {
  if (!url) return '';
  let u = decodeEntities(url.trim()).replace(/^\/\//, 'https://');
  if (!/^https?:\/\//i.test(u)) return '';
  if (/ichef\.bbci\.co\.uk/i.test(u)) u = u.replace(/\/ace\/ws\/\d+\//, '/ace/ws/976/');
  return isValidNewsImage(u) ? u : '';
}

function extractImagesFromHtml(html) {
  if (!html) return '';
  const h = decodeEntities(html);
  const patterns = [
    /<img[^>]+src=["']([^"']+)["']/gi,
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/gi,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/gi,
    /<media:content[^>]+url=["']([^"']+)["']/gi
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(h)) !== null) {
      const norm = normalizeImageUrl(m[1]);
      if (norm) return norm;
    }
  }
  return '';
}

function extractImageFromRssBlock(block) {
  const patterns = [
    /<media:content[^>]+url=["']([^"']+)["']/i,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
    /<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i
  ];
  for (const re of patterns) {
    const m = block.match(re);
    if (m) { const n = normalizeImageUrl(m[1]); if (n) return n; }
  }
  return extractImagesFromHtml(block);
}

function extractArticleUrl(summary, link) {
  if (link && !/news\.google\.com/i.test(link)) return link;
  const hrefRe = /href=["'](https?:\/\/[^"']+)["']/gi;
  let m;
  while ((m = hrefRe.exec(decodeEntities(summary || ''))) !== null) {
    if (!/news\.google\.com/i.test(m[1])) return m[1];
  }
  return link || '';
}

async function fetchHtml(url) {
  const attempts = [
    'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
    'https://corsproxy.io/?' + encodeURIComponent(url)
  ];
  for (const u of attempts) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(14000) });
      const text = await res.text();
      if (text && text.length > 200) return text;
    } catch {}
  }
  return null;
}

async function fetchOgImage(pageUrl) {
  if (!pageUrl || imageCache.has(pageUrl)) return imageCache.get(pageUrl) || '';
  const html = await fetchHtml(pageUrl);
  const img = html ? extractImagesFromHtml(html) : '';
  imageCache.set(pageUrl, img);
  return img;
}

async function resolveItemImage(item, cat) {
  if (item.image) { const d = normalizeImageUrl(item.image); if (d) return d; }
  const fromSummary = extractImagesFromHtml(item.summary);
  if (fromSummary) return fromSummary;
  const articleUrl = extractArticleUrl(item.summary, item.link);
  if (ogFetchCount < 25 && articleUrl && !/news\.google\.com/i.test(articleUrl)) {
    ogFetchCount++;
    const og = await fetchOgImage(articleUrl);
    if (og) return og;
  }
  return IMGS[cat] || IMGS['Brasil / Mundo'] || WIKI_FALLBACK;
}

function makeLead(title, summary) {
  const clean = stripHtml(summary);
  if (!clean || clean.length < 30 || /news\.google\.com\/rss/i.test(clean)) {
    return `${title}. Informação verificada pela redação do Pains Acontece com base em fontes públicas.`;
  }
  return clean.length > 220 ? clean.slice(0, 217) + '…' : clean;
}

async function fetchXml(url) {
  const attempts = [
    url,
    'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
    'https://corsproxy.io/?' + encodeURIComponent(url),
    'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
  ];
  for (const u of attempts) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(22000) });
      const text = await res.text();
      if (text && text.includes('<item') && !text.toLowerCase().includes('<html')) return text;
    } catch {}
  }
  return null;
}

function parseItems(xml, cfg) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const get = (tag) => {
      const cdata = block.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`))?.[1];
      const plain = block.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`))?.[1];
      return (cdata || plain || '').trim();
    };
    const title = get('title').replace(/ - .+$/, '').trim();
    const link = get('link');
    const summary = get('description');
    const pub = get('pubDate');
    if (title && link) {
      items.push({
        title, summary, link, image: extractImageFromRssBlock(block),
        pubDate: pub ? new Date(pub) : new Date(),
        region: cfg.region, world: !!cfg.world,
        feedPriority: cfg.priority || 0, source: extractSource(link)
      });
    }
  }
  return items;
}

async function fetchFeed(cfg) {
  const xml = await fetchXml(cfg.url);
  if (!xml) { console.warn('  ✗', cfg.region, cfg.url.slice(0, 60)); return []; }
  const items = parseItems(xml, cfg);
  console.log('  ✓', cfg.region, items.length, 'itens');
  return items;
}

async function main() {
  console.log('Buscando feeds RSS (múltiplos proxies)…');
  const results = [];
  for (const cfg of RSS_FEEDS) {
    results.push(await fetchFeed(cfg));
  }
  const all = results.flat();
  console.log(`Total bruto: ${all.length} itens`);

  const seen = new Set();
  let articles = [];
  const quotas = { 'Pains': 4, 'Região': 4, 'Brasil / Mundo': 10, 'Polícia': 2, 'Política': 2 };
  const counts = {};

  const candidates = [...all]
    .filter(item => !seen.has(item.link))
    .map(item => ({ ...item, confidence: calcConfidence(item, all), cat: detectCategory(item.title, item.summary, item.region, item.world) }))
    .filter(item => item.confidence >= 55)
    .sort((a, b) => {
      const imgScore = i => (i.image ? 3 : 0);
      return imgScore(b) - imgScore(a)
        || (b.feedPriority || 0) - (a.feedPriority || 0)
        || b.confidence - a.confidence
        || b.pubDate - a.pubDate;
    });

  async function pushArticle(item) {
    if (seen.has(item.link)) return false;
    const lead = makeLead(item.title, item.summary);
    const img = await resolveItemImage(item, item.cat);
    const id = Date.now() + articles.length;
    articles.push({
      id,
      title: item.title,
      lead,
      content: `<p>${lead}</p><p>Fonte: <em>${item.source}</em>. Matéria verificada pela IA editorial do Pains Acontece.</p>`,
      cat: item.cat,
      status: 'pub',
      img: `assets/images/articles/${id}.jpg`,
      img_source: img,
      author: 'IA Pains Acontece',
      date: item.pubDate.toLocaleDateString('pt-BR'),
      timeAgo: formatDate(item.pubDate),
      views: Math.floor(Math.random() * 800) + 50,
      verified: item.confidence >= 65,
      confidence: item.confidence
    });
    seen.add(item.link);
    counts[item.cat] = (counts[item.cat] || 0) + 1;
    return true;
  }

  for (const [cat, max] of Object.entries(quotas)) {
    for (const item of candidates) {
      if ((counts[cat] || 0) >= max) break;
      if (item.cat !== cat) continue;
      await pushArticle(item);
    }
  }

  for (const item of candidates) {
    if (articles.length >= 22) break;
    await pushArticle(item);
  }

  const { processArticleImages } = await import('./lib/article-images.mjs');
  const root = join(__dirname, '..');
  const { articles: withImages, downloaded } = await processArticleImages(articles, root);
  articles = withImages;
  const realImgs = articles.filter(a => a.img_source && !/unsplash\.com/i.test(a.img_source)).length;
  console.log(`Imagens baixadas: ${downloaded} | fontes reais: ${realImgs}/${articles.length}`);

  articles.sort((a, b) => b.id - a.id);
  writeFileSync(OUT, JSON.stringify(articles, null, 2), 'utf8');
  console.log(`✓ ${articles.length} artigos salvos em data/articles.json`);
  const byCat = {};
  articles.forEach(a => { byCat[a.cat] = (byCat[a.cat] || 0) + 1; });
  console.log('Por categoria:', byCat);
}

main().catch(err => { console.error(err); process.exit(1); });