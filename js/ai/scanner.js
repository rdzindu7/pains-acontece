const PAScanner = (function () {
  const RSS_FEEDS = [
    { url: 'https://news.google.com/rss/search?q=Pains+MG&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Pains', priority: 3 },
    { url: 'https://news.google.com/rss/search?q=Pains+Minas+Gerais+prefeitura&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Pains', priority: 3 },
    { url: 'https://news.google.com/rss/search?q=Pains+MG+not%C3%ADcias&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Pains', priority: 3 },
    { url: 'https://news.google.com/rss/search?q=Formiga+MG&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Região', priority: 2 },
    { url: 'https://news.google.com/rss/search?q=Piumhi+MG&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Região', priority: 2 },
    { url: 'https://news.google.com/rss/search?q=Alto+S%C3%A3o+Francisco+Mineiro&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Região', priority: 2 },
    { url: 'https://news.google.com/rss/search?q=Dores+do+Indai%C3%A1+MG&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Região', priority: 2 },
    { url: 'https://news.google.com/rss/search?q=Minas+Gerais&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Brasil / Mundo', priority: 1 },
    { url: 'https://news.google.com/rss/search?q=Brasil+not%C3%ADcias&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Brasil / Mundo', priority: 1 },
    { url: 'https://news.google.com/rss/search?q=site:g1.globo.com+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Brasil / Mundo', priority: 1 },
    { url: 'https://news.google.com/rss/search?q=mundo+internacional&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Brasil / Mundo', priority: 1, world: true },
    { url: 'https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en', region: 'Brasil / Mundo', priority: 1, world: true },
    { url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', region: 'Brasil / Mundo', priority: 2, world: true },
    { url: 'https://g1.globo.com/rss/g1/minas-gerais/', region: 'Região', priority: 2 },
    { url: 'https://g1.globo.com/rss/g1/', region: 'Brasil / Mundo', priority: 2 },
    { url: 'https://news.google.com/rss/search?q=economia+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Brasil / Mundo', priority: 1 },
    { url: 'https://news.google.com/rss/search?q=pol%C3%ADtica+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419', region: 'Brasil / Mundo', priority: 1 }
  ];

  const TRUSTED = ['gov.br', 'g1.globo.com', 'uol.com.br', 'r7.com', 'otempo.com.br', 'em.com.br', 'prefeitura', 'camara', 'pains.mg.gov.br', 'bbc.com', 'bbc.co.uk', 'cnn.com', 'reuters.com', 'agenciabrasil', 'folha.uol', 'estadao'];

  const CAT_KEYWORDS = {
    'Polícia': ['policia', 'pm', 'prisao', 'assalto', 'roubo', 'crime', 'delegacia'],
    'Política': ['camara', 'prefeito', 'vereador', 'eleicao', 'politica', 'governo', 'prefeitura'],
    'Saúde': ['saude', 'ubs', 'hospital', 'dengue', 'vacina', 'medico', 'sus'],
    'Educação': ['escola', 'educacao', 'professor', 'aluno', 'matricula'],
    'Agenda': ['festival', 'evento', 'show', 'feira', 'celebracao'],
    'Empregos': ['emprego', 'vaga', 'sine', 'trabalho', 'contratacao'],
    'Esportes': ['futebol', 'campeonato', 'atleta', 'esporte'],
    'Pains': ['pains'],
    'Região': ['formiga', 'piumhi', 'dores', 'bambui', 'regiao'],
    'Brasil / Mundo': ['brasil', 'mundo', 'nacional', 'internacional']
  };

  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function detectCategory(title, summary, feedRegion, isWorld) {
    if (isWorld || feedRegion === 'Brasil / Mundo') return 'Brasil / Mundo';
    if (feedRegion && feedRegion !== 'Últimas Notícias') return feedRegion;
    const text = norm(title + ' ' + summary);
    let best = 'Últimas Notícias', score = 0;
    for (const [cat, keys] of Object.entries(CAT_KEYWORDS)) {
      const s = keys.filter(k => text.includes(k)).length;
      if (s > score) { score = s; best = cat; }
    }
    if (text.includes('pains')) return 'Pains';
    return best;
  }

  function extractSource(link) {
    try { return new URL(link).hostname.replace('www.', ''); } catch { return 'web'; }
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

  const TZ = 'America/Sao_Paulo';

  function brNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  }

  function startOfTodayBR() {
    const d = brNow();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function isFreshNews(pubDate) {
    if (!pubDate || isNaN(pubDate.getTime())) return false;
    return pubDate >= startOfTodayBR();
  }

  function formatDate(d) {
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Há ${mins || 1} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Há ${hrs} hora${hrs > 1 ? 's' : ''}`;
    return `Há ${Math.floor(hrs / 24)} dia(s)`;
  }

  function formatDateBR(d) {
    return d.toLocaleDateString('pt-BR', { timeZone: TZ });
  }

  const imageCache = new Map();
  const htmlCache = new Map();
  let ogFetchCount = 0;
  const OG_FETCH_MAX = 10;
  const FETCH_TIMEOUT = 7000;
  const DEEP_VERIFY_MAX = 12;
  const DEEP_VERIFY_CONCURRENCY = 4;

  function pickImage(cat) {
    const imgs = {
      'Polícia': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80',
      'Política': 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
      'Saúde': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
      'Agenda': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
      'Empregos': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
      'Pains': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
      'Região': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
      'Brasil / Mundo': 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80'
    };
    return imgs[cat] || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
  }

  function decodeEntities(s) {
    if (!s) return '';
    return s
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  }

  function isValidNewsImage(url) {
    if (!url || typeof url !== 'string') return false;
    const u = url.trim();
    if (!/^https?:\/\//i.test(u) && !u.startsWith('//')) return false;
    if (/pixel|tracker|1x1|spacer|avatar|favicon|logo\.(svg|png)/i.test(u)) return false;
    if (/google\.com\/images\/branding|gstatic\.com\/images/i.test(u)) return false;
    return /(\.(jpg|jpeg|png|webp|gif)(\?|$))|\/(image|images|photo|thumb|media|upload|cpsprodpb|internal_photos|glbimg)/i.test(u);
  }

  function normalizeImageUrl(url) {
    if (!url) return '';
    let u = decodeEntities(url.trim()).replace(/^\/\//, 'https://');
    if (!/^https?:\/\//i.test(u)) return '';
    u = u.replace(/&amp;/g, '&');
    if (/ichef\.bbci\.co\.uk/i.test(u)) {
      u = u.replace(/\/ace\/ws\/\d+\//, '/ace/ws/976/');
    }
    if (/\.(jpg|jpeg|png|webp)/i.test(u) && !/\?/.test(u)) {
      u += (u.includes('?') ? '&' : '?') + 'w=800&q=80';
    }
    return isValidNewsImage(u) ? u : '';
  }

  function extractImagesFromHtml(html) {
    if (!html) return '';
    const h = decodeEntities(html);
    const patterns = [
      /<img[^>]+src=["']([^"']+)["']/gi,
      /property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/gi,
      /content=["']([^"']+)["'][^>]*property=["']og:image/gi,
      /<media:thumbnail[^>]+url=["']([^"']+)["']/gi,
      /<media:content[^>]+url=["']([^"']+)["']/gi,
      /<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/gi
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
    if (!block) return '';
    const patterns = [
      /<media:content[^>]+medium=["']image["'][^>]+url=["']([^"']+)["']/i,
      /<media:content[^>]+url=["']([^"']+)["'][^>]+medium=["']image/i,
      /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
      /<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image[^"']*["']/i
    ];
    for (const re of patterns) {
      const m = block.match(re);
      if (m) {
        const norm = normalizeImageUrl(m[1]);
        if (norm) return norm;
      }
    }
    return extractImagesFromHtml(block);
  }

  function extractArticleUrl(summary, link) {
    const candidates = [];
    if (link && !/news\.google\.com/i.test(link)) candidates.push(link);
    const h = decodeEntities(summary || '');
    const hrefRe = /href=["'](https?:\/\/[^"']+)["']/gi;
    let m;
    while ((m = hrefRe.exec(h)) !== null) {
      if (!/news\.google\.com|google\.com\/url/i.test(m[1])) candidates.push(m[1]);
    }
    return candidates[0] || link || '';
  }

  async function fetchHtml(url) {
    if (!url) return null;
    if (htmlCache.has(url)) return htmlCache.get(url);
    const attempts = [
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
      'https://corsproxy.io/?' + encodeURIComponent(url)
    ];
    for (const u of attempts) {
      try {
        const res = await fetch(u, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
        const text = await res.text();
        if (text && text.length > 200 && !/^<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*<title>50[03]/i.test(text)) {
          htmlCache.set(url, text);
          return text;
        }
      } catch {}
    }
    htmlCache.set(url, null);
    return null;
  }

  async function fetchOgImage(pageUrl) {
    if (!pageUrl) return '';
    if (imageCache.has(pageUrl)) return imageCache.get(pageUrl);
    const html = await fetchHtml(pageUrl);
    let img = '';
    if (html) {
      img = extractImagesFromHtml(html);
      if (!img) {
        const m = html.match(/<meta[^>]+property=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/content=["']([^"']+)["'][^>]+property=["']twitter:image/i);
        if (m) img = normalizeImageUrl(m[1]);
      }
    }
    imageCache.set(pageUrl, img || '');
    return img;
  }

  async function resolveItemImage(item, cat, skipFetch) {
    if (item.image) {
      const direct = normalizeImageUrl(item.image);
      if (direct) return direct;
    }
    const fromSummary = extractImagesFromHtml(item.summary);
    if (fromSummary) return fromSummary;

    if (skipFetch) return pickImage(cat);

    const articleUrl = extractArticleUrl(item.summary, item.link);
    if (ogFetchCount < OG_FETCH_MAX && articleUrl && !/news\.google\.com\/rss/i.test(articleUrl)) {
      ogFetchCount++;
      const og = await fetchOgImage(articleUrl);
      if (og) return og;
    }
    return pickImage(cat);
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

  function makeLead(title, summary) {
    const clean = stripHtml(summary);
    if (!clean || clean.length < 30 || /news\.google\.com\/rss/i.test(clean)) {
      return `${title}. Informação verificada pela redação do Pains Acontece com base em fontes públicas.`;
    }
    return clean.length > 220 ? clean.slice(0, 217) + '…' : clean;
  }

  function buildContent(title, summary, source, link) {
    const clean = stripHtml(summary);
    let html = clean ? `<p>${clean}</p>` : '';
    html += `<p><strong>${title}</strong> — informação levantada pela redação do Pains Acontece com base em fontes públicas da região.</p>`;
    if (link) html += `<p>Fonte: <em>${source}</em>. <a href="${link}" target="_blank" rel="noopener">Leia na fonte original</a>.</p>`;
    return html;
  }

  function titleOverlap(a, b) {
    const wa = new Set(norm(a).split(/\s+/).filter(w => w.length > 3));
    const wb = new Set(norm(b).split(/\s+/).filter(w => w.length > 3));
    if (!wa.size || !wb.size) return 0;
    let hit = 0;
    wa.forEach(w => { if (wb.has(w)) hit++; });
    return hit / Math.max(wa.size, wb.size);
  }

  function extractPageMeta(html) {
    if (!html) return { title: '', excerpt: '', paragraphs: [], images: [] };
    const getMeta = (prop) => {
      const m = html.match(new RegExp(`property=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`content=["']([^"']+)["'][^>]*property=["']${prop}["']`, 'i'));
      return m ? stripHtml(m[1]) : '';
    };
    const title = getMeta('og:title') || getMeta('twitter:title');
    let excerpt = getMeta('og:description') || getMeta('description');
    const paragraphs = [];
    const paraRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pm;
    while ((pm = paraRe.exec(html)) !== null) {
      const t = stripHtml(pm[1]);
      if (t.length > 50 && !/cookie|newsletter|assin|publicidade|anúncio|banner/i.test(t)) {
        paragraphs.push(t);
      }
    }
    if (!excerpt && paragraphs.length) excerpt = paragraphs[0];
    const images = [];
    const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
    let im;
    while ((im = imgRe.exec(html)) !== null) {
      const u = normalizeImageUrl(im[1]);
      if (u && !images.includes(u)) images.push(u);
    }
    return { title, excerpt, paragraphs: paragraphs.slice(0, 10), images: images.slice(0, 5) };
  }

  function makeQuickLead(title, excerpt, paragraphs) {
    const base = excerpt || paragraphs.slice(0, 2).join(' ') || title;
    const text = base.replace(/\s+/g, ' ').trim();
    if (text.length <= 320) return text;
    const cut = text.slice(0, 317);
    const last = cut.lastIndexOf(' ');
    return (last > 200 ? cut.slice(0, last) : cut) + '…';
  }

  function buildDeepContent(item, meta, sources, confidence, audit, mainImg) {
    const articleUrl = extractArticleUrl(item.summary, item.link);
    const paras = meta.paragraphs?.length ? meta.paragraphs : [meta.excerpt || stripHtml(item.summary) || item.title];
    let html = paras.map(p => `<p>${p}</p>`).join('');
    if (meta.images?.length > 1) {
      html += '<div class="article-gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:24px 0">';
      meta.images.filter(u => u !== mainImg).slice(0, 3).forEach(u => {
        html += `<figure style="margin:0;border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,.08)"><img src="${u}" alt="" loading="lazy" style="width:100%;aspect-ratio:16/10;object-fit:cover"/></figure>`;
      });
      html += '</div>';
    }
    html += `<p><strong>${item.title}</strong> — matéria verificada pela IA editorial do Pains Acontece após busca minuciosa em múltiplas fontes públicas.</p>`;
    if (sources.length) {
      html += `<p><strong>Fontes consultadas (${sources.length}):</strong></p><ul>`;
      sources.slice(0, 6).forEach(s => {
        html += `<li><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a> — <em>${s.source}</em></li>`;
      });
      html += '</ul>';
    }
    html += `<p><em>✓ Verificação minuciosa — confiança ${confidence}% · ${audit.corroborations} corroboração(ões) · página ${audit.pageValidated ? 'validada' : 'não validada'} · ${new Date().toLocaleString('pt-BR')}</em></p>`;
    if (articleUrl) html += `<p><a href="${articleUrl}" target="_blank" rel="noopener">Leia na fonte original</a></p>`;
    return html;
  }

  async function deepVerifyPublication(item, allFeeds, cat) {
    const keys = keywords(item.title + ' ' + stripHtml(item.summary));
    const articleUrl = extractArticleUrl(item.summary, item.link);
    const trusted = isTrusted(articleUrl) || isTrusted(item.link);
    const hasRssImage = !!(item.image || extractImagesFromHtml(item.summary));

    const corroborations = allFeeds
      .filter(f => f.link !== item.link)
      .map(f => ({
        title: f.title, link: f.link, source: f.source || extractSource(f.link),
        score: matchScore(f.title + ' ' + stripHtml(f.summary), keys),
        overlap: titleOverlap(item.title, f.title)
      }))
      .filter(f => f.score >= 0.28 || f.overlap >= 0.35)
      .sort((a, b) => b.score + b.overlap - (a.score + a.overlap))
      .slice(0, 8);

    const skipPageFetch = hasRssImage && (trusted || corroborations.length >= 1);

    let pageValidated = false;
    let pageMeta = { excerpt: '', paragraphs: [], images: [] };
    let pageFetched = false;
    if (!skipPageFetch && articleUrl && !/news\.google\.com\/rss/i.test(articleUrl) && ogFetchCount < OG_FETCH_MAX) {
      ogFetchCount++;
      const html = await fetchHtml(articleUrl);
      pageFetched = !!html;
      if (html) {
        pageMeta = extractPageMeta(html);
        const blob = norm(pageMeta.title + ' ' + pageMeta.excerpt + ' ' + pageMeta.paragraphs.join(' ') + html.slice(0, 6000));
        const titleChunk = norm(item.title).slice(0, 50);
        pageValidated = matchScore(blob, keys) >= 0.22
          || (titleChunk.length > 10 && blob.includes(titleChunk))
          || keys.filter(k => blob.includes(k)).length >= Math.min(3, keys.length);
        const pageImg = pageMeta.images[0] || extractImagesFromHtml(html);
        if (pageImg) item.image = pageImg;
      }
    } else if (skipPageFetch && trusted) {
      pageValidated = true;
    }

    let confidence = 40;
    if (corroborations.length >= 1) confidence += 14;
    if (corroborations.length >= 2) confidence += 12;
    if (corroborations.length >= 4) confidence += 8;
    if (trusted) confidence += 16;
    if (pageValidated) confidence += 18;
    if (item.image || extractImagesFromHtml(item.summary)) confidence += 6;
    confidence = Math.min(97, confidence);

    const approved = confidence >= 58 && (
      corroborations.length >= 1 || pageValidated || trusted
    );

    const sources = [
      { title: item.title, url: articleUrl || item.link, source: item.source || extractSource(item.link) },
      ...corroborations.map(c => ({ title: c.title, url: c.link, source: c.source }))
    ];

    const audit = {
      corroborations: corroborations.length,
      pageValidated,
      trusted,
      feedsScanned: allFeeds.length,
      checkedAt: new Date().toISOString()
    };

    const img = await resolveItemImage(item, cat, pageFetched || skipPageFetch);
    const lead = pageMeta.excerpt
      ? (pageMeta.excerpt.length > 280 ? pageMeta.excerpt.slice(0, 277) + '…' : pageMeta.excerpt)
      : makeLead(item.title, item.summary);
    const quickLead = makeQuickLead(item.title, pageMeta.excerpt, pageMeta.paragraphs);

    return {
      approved,
      verified: approved && confidence >= 65,
      confidence,
      lead,
      quickLead,
      content: buildDeepContent(item, pageMeta, sources, confidence, audit, img),
      img,
      sources,
      source_url: articleUrl || item.link,
      deepVerified: true,
      audit
    };
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
        const res = await fetch(u, { signal: AbortSignal.timeout(10000) });
        const text = await res.text();
        if (text && text.includes('<item') && !/<html/i.test(text)) return text;
      } catch {}
    }
    return null;
  }

  function parseRssXml(xml, cfg) {
    const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    if (blocks.length) {
      return blocks.map(m => {
        const block = m[1];
        const get = (tag) => {
          const cdata = block.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`, 's'))?.[1];
          const plain = block.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 's'))?.[1];
          return decodeEntities((cdata || plain || '').trim());
        };
        const link = get('link');
        const title = get('title').replace(/ - .+$/, '').trim();
        const summary = get('description');
        const pub = get('pubDate');
        const image = extractImageFromRssBlock(block);
        return {
          title, summary, link, image,
          pubDate: pub ? new Date(pub) : new Date(),
          region: cfg.region, source: extractSource(link)
        };
      }).filter(i => i.title && i.link);
    }
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    return [...doc.querySelectorAll('item')].map(item => {
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const title = (item.querySelector('title')?.textContent || '').replace(/ - .+$/, '').trim();
      const summary = item.querySelector('description')?.textContent || '';
      const pub = item.querySelector('pubDate')?.textContent;
      const image = extractImagesFromHtml(summary);
      return { title, summary, link, image, pubDate: pub ? new Date(pub) : new Date(), region: cfg.region, source: extractSource(link) };
    }).filter(i => i.title && i.link);
  }

  async function fetchFeed(cfg) {
    try {
      const xml = await fetchXml(cfg.url);
      if (!xml) return [];
      return parseRssXml(xml, cfg);
    } catch { return []; }
  }

  let deepVerifyProgress = null;

  async function mapPool(list, concurrency, fn) {
    const results = new Array(list.length);
    let idx = 0;
    async function worker() {
      while (idx < list.length) {
        const i = idx++;
        results[i] = await fn(list[i], i);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
    return results;
  }

  function setDeepProgress(current, total, title) {
    deepVerifyProgress = { current, total, title };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pa-deep-verify', { detail: deepVerifyProgress }));
    }
  }

  async function processItems(all, seen, limit) {
    const sorted = [...all].sort((a, b) => {
      const imgScore = i => (i.image ? 3 : 0);
      return imgScore(b) - imgScore(a) || (b.feedPriority || 0) - (a.feedPriority || 0) || b.pubDate - a.pubDate;
    });
    const batch = [];
    for (const item of sorted) {
      if (seen.has(item.link)) continue;
      if (!isFreshNews(item.pubDate)) continue;
      const cat = detectCategory(item.title, item.summary, item.region, item.world);
      batch.push({ item, cat });
      seen.add(item.link);
      if (limit && batch.length >= limit) break;
      if (batch.length >= DEEP_VERIFY_MAX) break;
    }

    ogFetchCount = 0;
    const total = batch.length;
    let done = 0;

    const verified = await mapPool(batch, DEEP_VERIFY_CONCURRENCY, async ({ item, cat }) => {
      const deep = await deepVerifyPublication(item, all, cat);
      done++;
      setDeepProgress(done, total, item.title);
      if (!deep.approved) return null;
      return {
        title: item.title,
        lead: deep.lead,
        quickLead: deep.quickLead,
        content: deep.content,
        cat, img: deep.img, author: 'IA Pains Acontece',
        date: formatDateBR(item.pubDate),
        pubISO: item.pubDate.toISOString(),
        timeAgo: formatDate(item.pubDate),
        source: item.source, source_url: deep.source_url, region: item.region,
        verified: deep.verified, confidence: deep.confidence,
        deepVerified: true, audit: deep.audit, sources: deep.sources,
        status: 'pending'
      };
    });

    const items = verified.filter(Boolean);
    setDeepProgress(total, total, 'Concluído');
    items.sort((a, b) => b.confidence - a.confidence);
    return items;
  }

  let feedCache = null;
  let feedCacheAt = 0;
  const CACHE_TTL = 8 * 60 * 1000;

  const STOPWORDS = new Set([
    'sobre', 'como', 'qual', 'quais', 'quando', 'onde', 'porque', 'por', 'para', 'com', 'sem',
    'uma', 'uns', 'umas', 'the', 'and', 'que', 'dos', 'das', 'nos', 'nas', 'pelo', 'pela',
    'isso', 'essa', 'esse', 'este', 'esta', 'aqui', 'ali', 'mais', 'menos', 'muito', 'pouco',
    'noticia', 'noticias', 'recente', 'recentes', 'aconteceu', 'ultimas', 'buscar', 'verificar'
  ]);

  function keywords(text) {
    const n = norm(text);
    const tokens = n.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOPWORDS.has(w));
    const places = ['pains', 'formiga', 'piumhi', 'minas', 'gerais', 'brasil', 'mundo', 'regiao'];
    places.forEach(p => { if (n.includes(p) && !tokens.includes(p)) tokens.unshift(p); });
    return [...new Set(tokens)];
  }

  function matchScore(text, keys) {
    if (!keys.length) return 0;
    const n = norm(text);
    let hits = 0;
    keys.forEach(k => { if (n.includes(k)) hits++; });
    return hits / keys.length;
  }

  async function getFeedItems(force) {
    if (!force && feedCache && Date.now() - feedCacheAt < CACHE_TTL) return feedCache;
    const priorityFeeds = RSS_FEEDS.filter(f => (f.priority || 0) >= 2);
    const restFeeds = RSS_FEEDS.filter(f => (f.priority || 0) < 2);
    const mapFeed = async cfg => {
      const items = await fetchFeed(cfg);
      return items.map(i => ({ ...i, feedPriority: cfg.priority || 0, world: !!cfg.world }));
    };
    const priorityResults = await Promise.all(priorityFeeds.map(mapFeed));
    const restResults = await Promise.all(restFeeds.map(mapFeed));
    feedCache = [...priorityResults, ...restResults].flat();
    feedCacheAt = Date.now();
    return feedCache;
  }

  async function fetchAllFeeds() {
    return getFeedItems(false);
  }

  async function scanNews(seenUrls = []) {
    const all = await fetchAllFeeds();
    const seen = new Set(seenUrls);
    const items = await processItems(all, seen, null);
    return { items, seenUrls: [...seen] };
  }

  async function scanNewsFull(seenUrls = []) {
    ogFetchCount = 0;
    imageCache.clear();
    const all = await fetchAllFeeds();
    const seen = new Set(seenUrls);
    const items = await processItems(all, seen, null);
    return { items, seenUrls: [...seen], total: all.length };
  }

  async function searchHeadlines(query, limit = 8) {
    const keys = keywords(query);
    const all = await getFeedItems(false);
    if (!all.length) return [];

    return all
      .map(item => ({
        ...item,
        score: matchScore(item.title + ' ' + stripHtml(item.summary), keys) + (item.feedPriority || 0) * 0.05
      }))
      .filter(i => i.score >= 0.2 || (keys.includes('pains') && norm(i.title).includes('pains')))
      .sort((a, b) => b.score - a.score || b.pubDate - a.pubDate)
      .slice(0, limit);
  }

  async function searchPublished(query, limit = 8) {
    let articles = [];
    try {
      if (typeof PAStore !== 'undefined' && PAStore.getArticles) {
        articles = PAStore.getArticles('pub');
      }
      if (!articles.length && typeof PAAPI !== 'undefined') {
        articles = await PAAPI.getArticles('pub');
      }
    } catch {}
    const keys = keywords(query);
    return articles
      .map(a => ({
        ...a,
        score: matchScore((a.title || '') + ' ' + (a.lead || ''), keys) + (a.verified ? 0.15 : 0)
      }))
      .filter(a => a.score >= 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async function verifyText(text) {
    const keys = keywords(text);
    const [all, published] = await Promise.all([
      getFeedItems(false),
      searchPublished(text, 12)
    ]);

    const feedMatches = all
      .map(item => ({
        ...item,
        score: matchScore(item.title + ' ' + stripHtml(item.summary), keys)
      }))
      .filter(i => i.score >= 0.25)
      .sort((a, b) => b.score - a.score);

    const trusted = feedMatches.filter(m => isTrusted(m.link));
    const pubMatches = published.filter(a => matchScore((a.title || '') + ' ' + (a.lead || ''), keys) >= 0.2);

    let confidence = 38;
    if (feedMatches.length) confidence += 18;
    if (feedMatches.length >= 2) confidence += 12;
    if (feedMatches.length >= 4) confidence += 8;
    if (trusted.length) confidence += 15;
    if (pubMatches.length) confidence += 12;
    if (keys.includes('pains') && feedMatches.some(m => norm(m.title).includes('pains'))) confidence += 10;
    if (!all.length && pubMatches.length) confidence = Math.max(confidence, 62);
    confidence = Math.min(96, confidence);

    const sources = [
      ...pubMatches.slice(0, 3).map(a => ({ title: a.title, url: 'pages/noticia.html?id=' + a.id, source: 'Pains Acontece', local: true })),
      ...feedMatches.slice(0, 5).map(m => ({ title: m.title, url: m.link, source: m.source }))
    ].slice(0, 6);

    const verified = confidence >= 58 || pubMatches.length >= 1 || trusted.length >= 1;

    return {
      verified,
      confidence,
      sources,
      feedCount: feedMatches.length,
      publishedCount: pubMatches.length,
      feedsLoaded: all.length,
      message: verified
        ? `Informação corroborada por ${sources.length} fonte(s)${pubMatches.length ? ' (inclui matérias do portal)' : ''}. Confiança: ${confidence}%.`
        : all.length
          ? `Poucas correspondências nas fontes (${feedMatches.length} de ${all.length} analisadas). Confiança: ${confidence}%.`
          : 'Feeds temporariamente indisponíveis — use "Buscar Agora" para nova varredura.'
    };
  }

  return {
    scanNews, scanNewsFull, verifyText, deepVerifyPublication, getFeedItems, searchHeadlines, searchPublished,
    detectCategory, pickImage, resolveItemImage, formatDate, keywords, RSS_FEEDS,
    isFreshNews, startOfTodayBR, makeQuickLead,
    getDeepProgress: () => deepVerifyProgress,
    invalidateCache: () => { feedCache = null; feedCacheAt = 0; imageCache.clear(); htmlCache.clear(); ogFetchCount = 0; deepVerifyProgress = null; }
  };
})();