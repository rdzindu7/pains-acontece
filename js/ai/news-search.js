/**
 * PANewsIA — busca rigorosa de notícias em Pains e região
 */
const PANewsIA = (function () {
  const MIN_SCORE = 0.28;
  const MIN_REGION_SCORE = 0.22;

  const REGION_KEYWORDS = [
    'pains', 'formiga', 'piumhi', 'bambui', 'bambuí', 'dores do indaia', 'dores do indaiá',
    'dores indaia', 'sao sebastiao do oeste', 'são sebastião do oeste', 'cristais', 'medeiros',
    'pedra do indaia', 'pedra do indaiá', 'alto sao francisco', 'alto são francisco',
    'sudoeste mineiro', 'sudoeste de minas', 'regiao', 'região', 'minas gerais', 'mg'
  ];

  const REGION_CATS = new Set(['Pains', 'Região', 'Polícia', 'Política', 'Saúde', 'Agenda', 'Empregos']);

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function isRegionalText(text) {
    const n = norm(text);
    return REGION_KEYWORDS.some(k => n.includes(norm(k)));
  }

  function regionBoost(item, text) {
    let boost = 0;
    const n = norm(text);
    if (n.includes('pains')) boost += 0.35;
    if (item.cat === 'Pains') boost += 0.4;
    if (item.cat === 'Região') boost += 0.3;
    if (REGION_CATS.has(item.cat)) boost += 0.1;
    if (isRegionalText(text)) boost += 0.25;
    if (item.feedRegion === 'Pains') boost += 0.3;
    if (item.feedRegion === 'Região') boost += 0.2;
    if (item.verified) boost += 0.1;
    return boost;
  }

  function parseQuery(text) {
    const raw = (text || '').trim();
    const n = norm(raw);
    const topic = raw
      .replace(/^(buscar|pesquisar|noticias?|notícias?)\s+(sobre|de|em|para)?\s*/i, '')
      .replace(/\s+(em|de)\s+(pains|regi[aã]o|minas).*$/i, '')
      .trim();
    return {
      raw,
      topic: topic || raw,
      painsFocus: /pains/.test(n),
      regiaoFocus: /regi[aã]o|sudoeste|alto sao/.test(n),
      isNewsQuery: /noticia|notícia|manchete|fato|aconteceu|novidade|buscar|pesquisar/.test(n) || raw.length > 2
    };
  }

  function articlePath(id) {
    const base = location.pathname.includes('/pages/') ? 'noticia.html' : 'pages/noticia.html';
    return `${base}?id=${id}`;
  }

  function formatPubDate(item) {
    if (item.date) return item.date;
    if (item.pubDate && typeof PAScanner !== 'undefined') {
      try { return PAScanner.formatPubLabel(item.pubDate); } catch {}
    }
    return '';
  }

  function formatPublished(a) {
    const date = a.date || (a.pubISO ? formatPubDate({ pubDate: a.pubISO }) : '');
    return `
      <a href="${articlePath(a.id)}" class="panews-card panews-card--local">
        <span class="panews-src"><i class="fas fa-check-circle"></i> Pains Acontece</span>
        <strong>${esc(a.title)}</strong>
        <p>${esc((a.lead || '').slice(0, 140))}${(a.lead || '').length > 140 ? '…' : ''}</p>
        <span class="panews-meta">${esc(a.cat || '')}${date ? ' · ' + esc(date) : ''}</span>
      </a>`;
  }

  function formatHeadline(h) {
    const url = h.link || '#';
    return `
      <a href="${esc(url)}" target="_blank" rel="noopener" class="panews-card panews-card--feed">
        <span class="panews-src"><i class="fas fa-rss"></i> ${esc(h.source || h.feedRegion || 'Fonte')}</span>
        <strong>${esc(h.title)}</strong>
        <p>${esc((h.summary || '').replace(/<[^>]+>/g, '').slice(0, 120))}…</p>
        <span class="panews-meta">${esc(h.feedRegion || 'Região')}</span>
      </a>`;
  }

  async function search(query, opts = {}) {
    const q = parseQuery(query);
    if (!q.isNewsQuery && q.topic.length < 3) {
      return {
        ok: false,
        message: 'Digite o assunto que deseja buscar. Exemplo: <em>prefeitura Pains</em> ou <em>saúde região</em>.',
        hint: 'Busca restrita a Pains MG e cidades do Alto São Francisco.'
      };
    }

    if (typeof PAStore !== 'undefined') await PAStore.init().catch(() => {});

    const topic = q.topic;
    let published = [];
    let headlines = [];

    if (typeof PAScanner !== 'undefined') {
      [published, headlines] = await Promise.all([
        PAScanner.searchPublished(topic, 20),
        PAScanner.searchHeadlines(topic, 20)
      ]);
    }

    published = published
      .map(a => {
        const text = `${a.title} ${a.lead || ''} ${a.cat || ''}`;
        const score = (a.score || 0) + regionBoost(a, text);
        return { ...a, score, kind: 'published' };
      })
      .filter(a => {
        if (a.score < MIN_SCORE) return false;
        const text = `${a.title} ${a.lead || ''}`;
        if (!q.painsFocus && !q.regiaoFocus) {
          return a.cat === 'Pains' || a.cat === 'Região' || isRegionalText(text) || a.score >= MIN_SCORE + 0.15;
        }
        return true;
      })
      .sort((a, b) => b.score - a.score);

    headlines = headlines
      .map(h => {
        const text = `${h.title} ${h.summary || ''}`;
        const score = (h.score || 0) + regionBoost(h, text);
        return { ...h, score, kind: 'headline' };
      })
      .filter(h => {
        if (h.score < MIN_REGION_SCORE) return false;
        if (!q.painsFocus && !q.regiaoFocus) {
          return h.feedRegion === 'Pains' || h.feedRegion === 'Região' || isRegionalText(`${h.title} ${h.summary}`);
        }
        return h.feedRegion !== 'Mundo' && h.feedRegion !== 'Brasil' || isRegionalText(`${h.title} ${h.summary}`);
      })
      .sort((a, b) => b.score - a.score);

    const results = [
      ...published.slice(0, 6),
      ...headlines.slice(0, 6)
    ].sort((a, b) => b.score - a.score).slice(0, 10);

    if (!results.length) {
      return {
        ok: false,
        message: `Nenhuma notícia rigorosa encontrada para <strong>"${esc(topic)}"</strong> em Pains e região.`,
        hint: 'Tente termos como: prefeitura, saúde, Formiga, Piumhi, eventos em Pains.'
      };
    }

    const pubCount = published.length;
    const feedCount = headlines.length;
    const html = results.map(r => r.kind === 'published' ? formatPublished(r) : formatHeadline(r)).join('');

    return {
      ok: true,
      intro: `Encontrei <strong>${results.length}</strong> resultado(s) rigorosos para <strong>"${esc(topic)}"</strong> em Pains e região (${pubCount} no portal · ${feedCount} nas fontes).`,
      html,
      count: results.length,
      published: pubCount,
      feeds: feedCount
    };
  }

  function formatReply(res) {
    if (!res.ok) {
      return `${res.message}<br><br><span style="font-size:.72rem;color:rgba(255,255,255,.45)">${res.hint || ''}</span>`;
    }
    return `${res.intro}<br><br>${res.html}<br><br><span style="font-size:.65rem;color:rgba(255,255,255,.4)">Busca rigorosa · Pains e Alto São Francisco Mineiro</span>`;
  }

  function isNewsSearchIntent(text) {
    const n = norm(text);
    if (/noticia|notícia|manchete|novidade|aconteceu|fatos|buscar not|pesquisar not/.test(n)) return true;
    if (/prefeitura|vereador|camara|câmara|ubs|hospital|escola/.test(n) && /pains|formiga|piumhi|regi[aã]o|mg/.test(n)) return true;
    if (/o que (aconteceu|houve)|tem noticia|tem notícia/.test(n)) return true;
    return false;
  }

  return { search, formatReply, isNewsSearchIntent, parseQuery, REGION_KEYWORDS };
})();