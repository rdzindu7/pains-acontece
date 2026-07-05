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
    return raw
      .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim();
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
        if (text && text.includes('<item') && !text.includes('<html')) return text;
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
        lead: stripHtml(item.summary).slice(0, 220),
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

  async function fetchAllFeeds() {
    const results = await Promise.all(RSS_FEEDS.map(async cfg => {
      const items = await fetchFeed(cfg);
      return items.map(i => ({ ...i, feedPriority: cfg.priority || 0, world: !!cfg.world }));
    }));
    return results.flat();
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

  async function verifyText(text) {
    const results = await Promise.all(RSS_FEEDS.slice(0, 4).map(fetchFeed));
    const all = results.flat();
    const words = norm(text).split(/\s+/).filter(w => w.length > 4);
    const matches = all.filter(item => words.filter(w => norm(item.title + ' ' + item.summary).includes(w)).length >= Math.min(4, words.length * 0.3));
    const trusted = matches.filter(m => isTrusted(m.link));
    let confidence = 35;
    if (matches.length) confidence += 25;
    if (trusted.length) confidence += 25;
    if (matches.length >= 2) confidence += 15;
    confidence = Math.min(95, confidence);
    return {
      verified: confidence >= 60, confidence,
      sources: matches.slice(0, 5).map(m => ({ title: m.title, url: m.link, source: m.source })),
      message: confidence >= 60
        ? `Informação corroborada por ${matches.length} fonte(s). Confiança: ${confidence}%.`
        : `Verificação parcial (${confidence}%). Revise antes de publicar.`
    };
  }

  return { scanNews, scanNewsFull, verifyText, detectCategory, pickImage, formatDate, RSS_FEEDS };
})();