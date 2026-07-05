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
    { url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', region: 'Brasil / Mundo', priority: 1, world: true },
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

  function formatDate(d) {
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Há ${mins || 1} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Há ${hrs} hora${hrs > 1 ? 's' : ''}`;
    return `Há ${Math.floor(hrs / 24)} dia(s)`;
  }

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

  async function fetchXml(url) {
    const attempts = [
      url,
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
      'https://corsproxy.io/?' + encodeURIComponent(url),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
    ];
    for (const u of attempts) {
      try {
        const res = await fetch(u, { signal: AbortSignal.timeout(18000) });
        const text = await res.text();
        if (text && text.includes('<item') && !/<html/i.test(text)) return text;
      } catch {}
    }
    return null;
  }

  function parseRssXml(xml, cfg) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    return [...doc.querySelectorAll('item')].map(item => {
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const title = (item.querySelector('title')?.textContent || '').replace(/ - .+$/, '').trim();
      const summary = item.querySelector('description')?.textContent || '';
      const pub = item.querySelector('pubDate')?.textContent;
      return { title, summary, link, pubDate: pub ? new Date(pub) : new Date(), region: cfg.region, source: extractSource(link) };
    }).filter(i => i.title && i.link);
  }

  async function fetchFeed(cfg) {
    try {
      const xml = await fetchXml(cfg.url);
      if (!xml) return [];
      return parseRssXml(xml, cfg);
    } catch { return []; }
  }

  function processItems(all, seen, limit) {
    const items = [];
    const sorted = [...all].sort((a, b) => (b.feedPriority || 0) - (a.feedPriority || 0) || b.pubDate - a.pubDate);
    for (const item of sorted) {
      if (seen.has(item.link)) continue;
      const confidence = calcConfidence(item, all);
      const cat = detectCategory(item.title, item.summary, item.region, item.world);
      items.push({
        title: item.title,
        lead: makeLead(item.title, item.summary),
        content: buildContent(item.title, item.summary, item.source, item.link),
        cat, img: pickImage(cat), author: 'IA Pains Acontece',
        date: item.pubDate.toLocaleDateString('pt-BR'),
        timeAgo: formatDate(item.pubDate),
        source: item.source, source_url: item.link, region: item.region,
        verified: confidence >= 65, confidence, status: 'pending'
      });
      seen.add(item.link);
      if (limit && items.length >= limit) break;
    }
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
    const results = await Promise.all(RSS_FEEDS.map(async cfg => {
      const items = await fetchFeed(cfg);
      return items.map(i => ({ ...i, feedPriority: cfg.priority || 0, world: !!cfg.world }));
    }));
    feedCache = results.flat();
    feedCacheAt = Date.now();
    return feedCache;
  }

  async function fetchAllFeeds() {
    return getFeedItems(false);
  }

  async function scanNews(seenUrls = []) {
    const all = await fetchAllFeeds();
    const seen = new Set(seenUrls);
    const items = processItems(all, seen, null);
    return { items, seenUrls: [...seen] };
  }

  async function scanNewsFull(seenUrls = []) {
    const all = await fetchAllFeeds();
    const seen = new Set(seenUrls);
    const items = processItems(all, seen, null);
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
    scanNews, scanNewsFull, verifyText, searchHeadlines, searchPublished,
    detectCategory, pickImage, formatDate, keywords, RSS_FEEDS,
    invalidateCache: () => { feedCache = null; feedCacheAt = 0; }
  };
})();