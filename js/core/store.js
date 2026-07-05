const PAStore = (function () {
  const LS_KEY = 'pa_articles_cache_v2';
  let articles = [];

  async function init() {
    try {
      articles = await PAAPI.getArticles();
    } catch (err) {
      try {
        const cached = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        if (cached.length) {
          articles = cached;
          return articles;
        }
      } catch {}
      throw err;
    }
    localStorage.setItem(LS_KEY, JSON.stringify(articles));
    return articles;
  }

  function getArticles(status) {
    const list = status ? articles.filter(a => a.status === status) : articles;
    return [...list];
  }

  function getArticle(id) {
    return articles.find(a => String(a.id) === String(id));
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
    const res = await PAAPI.incrementViews(id);
    const art = getArticle(id);
    if (art) art.views = res.views;
    localStorage.setItem(LS_KEY, JSON.stringify(articles));
  }

  return { init, getArticles, getArticle, articlesForAdmin, addArticle, updateArticle, deleteArticle, incrementViews };
})();