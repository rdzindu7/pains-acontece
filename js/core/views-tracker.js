/** Sincroniza visualizações entre site, cache local e painel admin */
const PAViewsTracker = (function () {
  const LS_VIEWS = 'pa_views_sync_v1';
  const SS_VIEWED = 'pa_viewed_session_v1';

  function readStore() {
    try { return JSON.parse(localStorage.getItem(LS_VIEWS) || '{}'); } catch { return {}; }
  }

  function writeStore(store) {
    try { localStorage.setItem(LS_VIEWS, JSON.stringify(store)); } catch {}
  }

  function sessionIds() {
    try { return new Set(JSON.parse(sessionStorage.getItem(SS_VIEWED) || '[]')); } catch { return new Set(); }
  }

  function markSession(id) {
    const s = sessionIds();
    s.add(String(id));
    try { sessionStorage.setItem(SS_VIEWED, JSON.stringify([...s])); } catch {}
  }

  function wasViewed(id) {
    return sessionIds().has(String(id));
  }

  function getCount(id) {
    const store = readStore();
    return store[String(id)] || 0;
  }

  function setCount(id, views) {
    const store = readStore();
    const sid = String(id);
    store[sid] = Math.max(store[sid] || 0, Number(views) || 0);
    writeStore(store);
    return store[sid];
  }

  function bumpSiteTotal() {
    const store = readStore();
    store._siteTotal = (store._siteTotal || 0) + 1;
    writeStore(store);
  }

  function getSiteTotal() {
    return readStore()._siteTotal || 0;
  }

  function mergeArticles(articles) {
    const store = readStore();
    return (articles || []).map(a => {
      const synced = store[String(a.id)];
      const base = Number(a.views) || 0;
      if (synced != null && synced > base) return { ...a, views: synced };
      if (synced != null && synced < base) setCount(a.id, base);
      return a;
    });
  }

  function updateDom(id, views) {
    const txt = Number(views || 0).toLocaleString('pt-BR');
    document.querySelectorAll(`[data-pa-views="${id}"]`).forEach(el => { el.textContent = txt; });
    const chips = document.querySelectorAll('.meta-chip');
    chips.forEach(chip => {
      if (chip.querySelector('.fa-eye')) {
        chip.innerHTML = `<i class="fas fa-eye"></i> ${txt} leituras`;
      }
    });
  }

  async function trackView(id) {
    const sid = String(id);
    if (!sid) return { views: 0 };

    if (!wasViewed(sid)) {
      markSession(sid);
      bumpSiteTotal();
      let res = { views: getCount(sid) };
      try {
        if (typeof PAStore !== 'undefined' && PAStore.incrementViews) {
          res = await PAStore.incrementViews(sid);
        } else if (typeof PAAPI !== 'undefined') {
          res = await PAAPI.incrementViews(sid);
        }
      } catch (e) {
        console.warn('[views]', e);
      }
      const total = setCount(sid, res?.views ?? getCount(sid) + 1);
      updateDom(sid, total);
      return { views: total, new: true };
    }

    const current = getCount(sid);
    updateDom(sid, current);
    return { views: current, skipped: true };
  }

  return {
    trackView, mergeArticles, getCount, setCount, getSiteTotal, updateDom, wasViewed
  };
})();