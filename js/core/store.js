const PAStore = (function () {
  const LS_KEY = 'pa_articles_cache_v2';
  const LS_ADMIN = 'pa_admin_state_v2';
  let articles = [];

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms || 8000))
    ]);
  }

  function loadFromLocalSources() {
    const found = new Map();
    try {
      JSON.parse(localStorage.getItem(LS_KEY) || '[]').forEach(a => {
        if (a?.id != null) found.set(String(a.id), a);
      });
    } catch {}
    try {
      const admin = JSON.parse(localStorage.getItem(LS_ADMIN) || '{}');
      (admin.articles || []).forEach(a => {
        if (a?.id != null) found.set(String(a.id), a);
      });
    } catch {}
    return [...found.values()].sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  function findArticleLocal(id) {
    const sid = String(id);
    const inMem = articles.find(a => String(a.id) === sid);
    if (inMem) return inMem;
    return loadFromLocalSources().find(a => String(a.id) === sid) || null;
  }

  async function init() {
    try {
      articles = await withTimeout(PAAPI.getArticles(), 8000);
    } catch (err) {
      const local = loadFromLocalSources();
      if (local.length) {
        articles = local;
        return articles;
      }
      try {
        const cached = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        if (cached.length) {
          articles = cached;
          return articles;
        }
      } catch {}
      throw err;
    }
    if (!articles.length) {
      const local = loadFromLocalSources();
      if (local.length) articles = local;
    }
    localStorage.setItem(LS_KEY, JSON.stringify(articles));
    return articles;
  }

  function getArticles(status) {
    const list = status ? articles.filter(a => a.status === status) : articles;
    return [...list];
  }

  function getArticle(id) {
    return articles.find(a => String(a.id) === String(id)) || findArticleLocal(id);
  }

  function articlesForAdmin() {
    return [...articles];
  }

  async function addArticle(payload) {
    const art = await PAAPI.addArticle(payload);
    articles.unshift(art);
    localStorage.setItem(LS_KEY, JSON.stringify(articles));
    return art;
  }

  async function updateArticle(id, payload) {
    const art = await PAAPI.updateArticle(id, payload);
    const idx = articles.findIndex(a => String(a.id) === String(id));
    if (idx >= 0) articles[idx] = art || { ...articles[idx], ...payload };
    else if (art) articles.unshift(art);
    localStorage.setItem(LS_KEY, JSON.stringify(articles));
  }

  async function deleteArticle(id) {
    await PAAPI.deleteArticle(id);
    articles = articles.filter(a => String(a.id) !== String(id));
    localStorage.setItem(LS_KEY, JSON.stringify(articles));
  }

  async function incrementViews(id) {
    try {
      const res = await PAAPI.incrementViews(id);
      const art = getArticle(id);
      if (art && res) art.views = res.views;
      localStorage.setItem(LS_KEY, JSON.stringify(articles));
    } catch {}
  }

  return { init, getArticles, getArticle, findArticleLocal, articlesForAdmin, addArticle, updateArticle, deleteArticle, incrementViews };
})();