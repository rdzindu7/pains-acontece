/** Visualizações de matérias + visitas ao portal (site) */
const PAViewsTracker = (function () {
  const LS_VIEWS = 'pa_views_sync_v1';
  const SS_VIEWED = 'pa_viewed_session_v1';
  const SS_SITE_VISIT = 'pa_site_visit_session_v1';

  function readStore() {
    try { return JSON.parse(localStorage.getItem(LS_VIEWS) || '{}'); } catch { return {}; }
  }

  function writeStore(store) {
    try { localStorage.setItem(LS_VIEWS, JSON.stringify(store)); } catch {}
  }

  function isAdminPage() {
    return /\/pages\/admin\.html/i.test(location.pathname);
  }

  function isPublicPage() {
    return !isAdminPage() && !/\/pages\/(login|entrar|auth-callback)\.html/i.test(location.pathname);
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

  function getSiteVisits() {
    const store = readStore();
    return store._siteVisits || store._siteTotal || 0;
  }

  function setSiteVisits(total) {
    const store = readStore();
    const n = Math.max(store._siteVisits || store._siteTotal || 0, Number(total) || 0);
    store._siteVisits = n;
    writeStore(store);
    return n;
  }

  function bumpSiteVisitsLocal() {
    const store = readStore();
    const n = (store._siteVisits || store._siteTotal || 0) + 1;
    store._siteVisits = n;
    writeStore(store);
    return n;
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
      if (chip.querySelector('.fa-eye') && chip.querySelector('[data-pa-views]')) {
        const span = chip.querySelector('[data-pa-views]');
        if (span) span.textContent = txt;
      }
    });
  }

  function updateSiteVisitsDom(total) {
    const txt = Number(total || 0).toLocaleString('pt-BR');
    document.querySelectorAll('[data-pa-site-visits]').forEach(el => { el.textContent = txt; });
  }

  async function syncSiteVisitsFromCloud() {
    if (typeof PAAPI === 'undefined' || !PAAPI.getSiteVisits) return getSiteVisits();
    try {
      const res = await PAAPI.getSiteVisits();
      if (res?.total != null) return setSiteVisits(res.total);
    } catch (e) {
      console.warn('[views] site sync', e);
    }
    return getSiteVisits();
  }

  async function trackSiteVisit() {
    if (!isPublicPage()) return { total: 0, skipped: true };

    let total = await syncSiteVisitsFromCloud();
    updateSiteVisitsDom(total);

    if (sessionStorage.getItem(SS_SITE_VISIT)) {
      return { total, skipped: true };
    }
    sessionStorage.setItem(SS_SITE_VISIT, '1');

    try {
      if (typeof PAAPI !== 'undefined' && PAAPI.incrementSiteVisits) {
        const res = await PAAPI.incrementSiteVisits();
        if (res?.total != null) total = setSiteVisits(res.total);
        else total = bumpSiteVisitsLocal();
      } else {
        total = bumpSiteVisitsLocal();
      }
    } catch (e) {
      console.warn('[views] site visit', e);
      total = bumpSiteVisitsLocal();
    }

    updateSiteVisitsDom(total);
    return { total, new: true };
  }

  async function trackView(id) {
    const sid = String(id);
    if (!sid) return { views: 0 };

    if (!wasViewed(sid)) {
      markSession(sid);
      let res = { views: getCount(sid) };
      try {
        if (typeof PAStore !== 'undefined' && PAStore.incrementViews) {
          res = await PAStore.incrementViews(sid);
        } else if (typeof PAAPI !== 'undefined') {
          res = await PAAPI.incrementViews(sid);
        }
      } catch (e) {
        console.warn('[views] article', e);
      }
      const total = setCount(sid, res?.views ?? getCount(sid) + 1);
      updateDom(sid, total);
      return { views: total, new: true };
    }

    const current = getCount(sid);
    updateDom(sid, current);
    return { views: current, skipped: true };
  }

  function initSiteVisits() {
    trackSiteVisit().catch(() => {});
  }

  if (isPublicPage()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSiteVisits);
    } else {
      initSiteVisits();
    }
  }

  return {
    trackView,
    trackSiteVisit,
    mergeArticles,
    getCount,
    setCount,
    getSiteVisits,
    setSiteVisits,
    updateDom,
    updateSiteVisitsDom,
    wasViewed,
    syncSiteVisitsFromCloud
  };
})();