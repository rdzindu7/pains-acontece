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

  async function init(opts) {
    const useAdmin = !!(opts && opts.admin);
    const loader = useAdmin && typeof PAAPI.getArticlesAdmin === 'function'
      ? () => PAAPI.getArticlesAdmin()
      : () => PAAPI.getArticles();
    try {
      articles = await withTimeout(loader(), 8000);
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
    if (typeof PAViewsTracker !== 'undefined') articles = PAViewsTracker.mergeArticles(articles);
    return articles;
  }

  function getArticles(status) {
    const list = status ? articles.filter(a => a.status === status) : articles;
    return [...list];
  }

  async function fetchArticlePublic(id) {
    if (typeof PAAPI.fetchArticleFromJson === 'function') {
      try {
        const art = await PAAPI.fetchArticleFromJson(id);
        if (art) return art;
      } catch {}
    }
    return findArticleLocal(id);
  }

  function getArticle(id) {
    return articles.find(a => String(a.id) === String(id)) || findArticleLocal(id);
  }

  function articlesForAdmin() {
    let deleted = [];
    try {
      const state = JSON.parse(localStorage.getItem('pa_admin_state_v2') || '{}');
      deleted = (state.deleted || []).map(String);
    } catch {}
    if (!deleted.length) return [...articles];
    const hidden = new Set(deleted);
    return articles.filter(a => !hidden.has(String(a.id)));
  }

  function notifySiteUpdate() {
    if (typeof PAAutoReload !== 'undefined') PAAutoReload.signalUpdate();
  }

  async function addArticle(payload) {
    const art = await PAAPI.addArticle(payload);
    articles.unshift(art);
    localStorage.setItem(LS_KEY, JSON.stringify(articles));
    notifySiteUpdate();
    return art;
  }

  async function updateArticle(id, payload) {
    const art = await PAAPI.updateArticle(id, payload);
    const idx = articles.findIndex(a => String(a.id) === String(id));
    if (idx >= 0) articles[idx] = art || { ...articles[idx], ...payload };
    else if (art) articles.unshift(art);
    localStorage.setItem(LS_KEY, JSON.stringify(articles));
    notifySiteUpdate();
  }

  async function deleteArticle(id) {
    await PAAPI.deleteArticle(id);
    articles = articles.filter(a => String(a.id) !== String(id));
    localStorage.setItem(LS_KEY, JSON.stringify(articles));
    notifySiteUpdate();
  }

  async function incrementViews(id) {
    try {
      const res = await PAAPI.incrementViews(id);
      const art = getArticle(id);
      const views = res?.views ?? ((art?.views || 0) + 1);
      if (art) art.views = views;
      if (typeof PAViewsTracker !== 'undefined') PAViewsTracker.setCount(id, views);
      localStorage.setItem(LS_KEY, JSON.stringify(articles));
      return { views };
    } catch {
      return { views: typeof PAViewsTracker !== 'undefined' ? PAViewsTracker.getCount(id) : 0 };
    }
  }

  function syncLocalCache() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(articles));
    } catch {}
  }

  async function refreshFromCloud() {
    try {
      const loader = typeof PAAPI.getArticlesAdmin === 'function'
        ? () => PAAPI.getArticlesAdmin()
        : () => PAAPI.getArticles();
      articles = await withTimeout(loader(), 8000);
      syncLocalCache();
      return articles;
    } catch {
      return articles;
    }
  }

  function clearArticles() {
    articles = [];
    try { localStorage.removeItem(LS_KEY); } catch {}
  }

  function initAdmin() {
    return init({ admin: true });
  }

  return {
    init, initAdmin, clearArticles, getArticles, getArticle, fetchArticlePublic, findArticleLocal,
    syncLocalCache, refreshFromCloud, articlesForAdmin, addArticle, updateArticle, deleteArticle, incrementViews
  };
})();