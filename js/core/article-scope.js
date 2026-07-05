const PAArticleScope = (function () {
  const INTL_KW = [
    'ucrania', 'ucrânia', 'eua', 'estados unidos', 'europe', 'china', 'israel', 'gaza',
    'trump', 'biden', 'onu', 'nato', 'washington', 'londres', 'paris', 'moscou', 'russo',
    'russia', 'rússia', 'irã', 'ira', 'coreia', 'japao', 'japão', 'reino unido', 'frança',
    'alemanha', 'internacional', 'world', 'middle east', 'pentagono', 'pentágono'
  ];
  const BR_KW = [
    'brasil', 'brasilia', 'brasília', 'lula', 'bolsonaro', 'congresso nacional', 'stf',
    'planalto', 'minas gerais', ' mg ', 'governo federal', 'senado', 'câmara'
  ];
  const WORLD_DOMAINS = ['bbc.co.uk', 'bbc.com', 'reuters.com', 'cnn.com', 'aljazeera', 'nytimes.com', 'theguardian.com'];

  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function classifyBrasilOrMundo(title, summary) {
    const text = norm(`${title} ${summary}`);
    const intlHits = INTL_KW.filter(k => text.includes(norm(k))).length;
    const brHits = BR_KW.filter(k => text.includes(norm(k))).length;
    if (intlHits > brHits && intlHits >= 1) return 'Mundo';
    return 'Brasil';
  }

  function isWorldArticle(a) {
    if (!a) return false;
    if (a.world === true || a.cat === 'Mundo') return true;
    if (a.cat === 'Brasil / Mundo') {
      const src = (a.source_url || a.source || '').toLowerCase();
      if (WORLD_DOMAINS.some(d => src.includes(d))) return true;
      return classifyBrasilOrMundo(a.title, a.lead || a.quickLead || '') === 'Mundo';
    }
    return false;
  }

  function forHome(arts) {
    return (arts || []).filter(a => !isWorldArticle(a));
  }

  function forMundo(arts) {
    return (arts || []).filter(isWorldArticle);
  }

  function forBrasil(arts) {
    return (arts || []).filter(a => {
      if (isWorldArticle(a)) return false;
      return a.cat === 'Brasil' || a.cat === 'Brasil / Mundo';
    });
  }

  return { isWorldArticle, forHome, forMundo, forBrasil, classifyBrasilOrMundo };
})();