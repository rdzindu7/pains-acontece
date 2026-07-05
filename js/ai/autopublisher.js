const PAAutoPublisher = (function () {
  const MIN_CONF = 68;
  const MIN_CONF_EMPTY = 55;
  const MAX_PUBLISH = 25;
  const MAX_PUBLISH_EMPTY = 18;
  const LS_LAST = 'pa_autopub_last';
  const INTERVAL = 5 * 60 * 1000;

  async function run(force) {
    let existing = [];
    try {
      existing = await PAAPI.getArticles('pub');
    } catch {
      existing = [];
    }

    const isEmpty = !existing.length;
    if (!force && !isEmpty) {
      const last = parseInt(localStorage.getItem(LS_LAST) || '0', 10);
      if (Date.now() - last < INTERVAL) return { skipped: true, published: 0 };
    }

    const seen = existing.map(a => a.source_url || a.title).filter(Boolean);
    const { items } = force
      ? await PAScanner.scanNewsFull(seen)
      : await PAScanner.scanNews(seen);
    const minConf = isEmpty ? MIN_CONF_EMPTY : MIN_CONF;
    const maxPub = isEmpty ? MAX_PUBLISH_EMPTY : MAX_PUBLISH;

    const titles = new Set(existing.map(a => (a.title || '').toLowerCase().trim()));
    let published = 0;

    const sorted = [...items].sort((a, b) => {
      const pri = { 'Pains': 4, 'Região': 3, 'Brasil': 2, 'Brasil / Mundo': 2, 'Mundo': 1 };
      return (pri[b.cat] || 1) - (pri[a.cat] || 1) || b.confidence - a.confidence;
    });

    for (const item of sorted) {
      if (published >= maxPub) break;
      const t = (item.title || '').toLowerCase().trim();
      if (!t || titles.has(t)) continue;
      if (!item.deepVerified) continue;
      if (item.confidence < minConf) continue;
      if (!item.verified && item.confidence < (isEmpty ? 62 : 75)) continue;

      try {
        await PAAPI.addArticle({
          title: item.title,
          lead: item.lead,
          quickLead: item.quickLead,
          pubISO: item.pubISO,
          content: item.content,
          cat: item.cat,
          status: 'pub',
          img: item.img,
          img_source: item.img_source || item.img,
          video: item.video || '',
          author: 'IA Pains Acontece',
          date: item.date,
          timeAgo: item.timeAgo || 'Agora',
          verified: item.verified,
          confidence: item.confidence,
          deepVerified: true,
          source_url: item.source_url,
          world: item.world || item.cat === 'Mundo',
          views: 0
        });
        titles.add(t);
        published++;
      } catch {}
    }

    localStorage.setItem(LS_LAST, String(Date.now()));
    if (published > 0 && typeof PAAutoReload !== 'undefined') PAAutoReload.signalUpdate();
    return { skipped: false, published, scanned: items.length };
  }

  return { run };
})();