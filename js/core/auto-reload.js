/**
 * Atualiza conteúdo entre abas quando o admin publica.
 * Sem reload de página e sem polling de versão (evita piscar em loop).
 */
const PAAutoReload = (function () {
  const LS_SIGNAL = 'pa_update_signal';
  const DEBOUNCE_MS = 4000;
  let refreshTimer = null;
  let refreshing = false;
  let lastHandled = 0;

  function isAdminPage() {
    return /\/pages\/admin\.html/i.test(location.pathname);
  }

  function clearArticlesCache() {
    try { localStorage.removeItem('pa_articles_cache_v2'); } catch {}
  }

  async function softRefresh() {
    if (refreshing || isAdminPage()) return false;
    refreshing = true;
    try {
      clearArticlesCache();
      if (typeof PAStore !== 'undefined' && typeof PAStore.init === 'function') {
        await PAStore.init();
      }
      if (typeof window.PAHomeRefresh === 'function') {
        window.PAHomeRefresh();
        return true;
      }
      if (typeof window.PANoticiaRefresh === 'function') {
        await window.PANoticiaRefresh();
        return true;
      }
    } catch (e) {
      console.warn('[PAAutoReload] refresh', e);
    } finally {
      refreshing = false;
    }
    return false;
  }

  function scheduleSoftRefresh() {
    if (isAdminPage()) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { softRefresh().catch(() => {}); }, DEBOUNCE_MS);
  }

  function signalUpdate() {
    const t = Date.now();
    const payload = JSON.stringify({ t, from: isAdminPage() ? 'admin' : 'site' });
    try { localStorage.setItem(LS_SIGNAL, payload); } catch {}
    if (t - lastHandled > 500) scheduleSoftRefresh();
  }

  function onStorageSignal(e) {
    if (e.key !== LS_SIGNAL || !e.newValue || isAdminPage()) return;
    try {
      const data = JSON.parse(e.newValue);
      if (data.t && data.t <= lastHandled) return;
      lastHandled = data.t || Date.now();
    } catch {
      lastHandled = Date.now();
    }
    scheduleSoftRefresh();
  }

  function init() {
    window.addEventListener('storage', onStorageSignal);
  }

  return { init, signalUpdate, softRefresh };
})();

PAAutoReload.init();