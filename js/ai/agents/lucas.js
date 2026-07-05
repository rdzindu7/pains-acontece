const PALucas = (function () {
  const PROFILE = {
    id: 'lucas',
    name: 'Lucas Ferreira',
    role: 'Analista de Fontes',
    icon: 'fa-satellite-dish',
    color: '#2ecc2e'
  };

  async function investigate(query) {
    const [published, headlines, verification, feeds] = await Promise.all([
      PAScanner.searchPublished(query, 8),
      PAScanner.searchHeadlines(query, 8),
      PAScanner.verifyText(query),
      PAScanner.getFeedItems(false)
    ]);
    return {
      agent: PROFILE,
      query,
      published,
      headlines,
      verification,
      feedsLoaded: feeds.length,
      scannedAt: new Date().toISOString()
    };
  }

  async function verify(text) {
    const verification = await PAScanner.verifyText(text);
    const headlines = await PAScanner.searchHeadlines(text, 6);
    return { agent: PROFILE, query: text, verification, headlines, published: [] };
  }

  async function scanFull(force) {
    if (force) PAScanner.invalidateCache?.();
    const result = typeof PAAutoPublisher !== 'undefined'
      ? await PAAutoPublisher.run(!!force)
      : { published: 0, scanned: 0, skipped: true };
    const investigation = await investigate('Pains MG notícias últimos 2 dias');
    return {
      agent: PROFILE,
      scan: result,
      ...investigation,
      query: 'varredura completa'
    };
  }

  function statusMessage(phase, detail) {
    const msgs = {
      feeds: 'Conectando aos feeds de Pains, região, Brasil e mundo…',
      verify: `Cruzando fontes — confiança ${detail?.confidence || '…'}%`,
      scan: `Varredura: ${detail?.current || 0}/${detail?.total || '…'} matérias`,
      done: `Análise concluída — ${detail?.sources || 0} fonte(s) consultada(s)`
    };
    return { agent: PROFILE, status: msgs[phase] || 'Analisando fontes…', phase, detail };
  }

  return { PROFILE, investigate, verify, scanFull, statusMessage };
})();