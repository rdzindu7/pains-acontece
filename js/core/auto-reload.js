/**
 * Atualiza abas públicas quando o admin publica ou há novo deploy.
 * Evita reload em loop: prioriza script carregado, cooldown e refresh suave.
 */
const PAAutoReload = (function () {
  const LS_SIGNAL = 'pa_update_signal';
  const SS_RELOAD_AT = 'pa_last_full_reload';
  const SS_DEPLOY_VER = 'pa_seen_deploy_ver';
  const POLL_MS = 60000;
  const RELOAD_COOLDOWN_MS = 20000;
  let knownBuild = null;
  let reloading = false;
  let refreshing = false;
  let pollTimer = null;

  function isAdminPage() {
    return /\/pages\/admin\.html/i.test(location.pathname);
  }

  function currentBuild() {
    if (typeof PAContentPurge !== 'undefined' && PAContentPurge.VER) {
      return PAContentPurge.VER;
    }
    return document.querySelector('meta[name="pa-build"]')?.content || null;
  }

  function purgeScriptUrl() {
    return location.pathname.includes('/pages/')
      ? '../js/core/purge.js'
      : 'js/core/purge.js';
  }

  async function fetchRemoteBuild() {
    try {
      const res = await fetch(purgeScriptUrl() + '?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return null;
      const text = await res.text();
      const m = text.match(/VER\s*=\s*['"]([^'"]+)['"]/);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  function canFullReload() {
    const last = parseInt(sessionStorage.getItem(SS_RELOAD_AT) || '0', 10);
    return Date.now() - last >= RELOAD_COOLDOWN_MS;
  }

  function markFullReload() {
    try { sessionStorage.setItem(SS_RELOAD_AT, String(Date.now())); } catch {}
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
      console.warn('[PAAutoReload] soft refresh', e);
    } finally {
      refreshing = false;
    }
    return false;
  }

  function reloadPage() {
    if (reloading || !canFullReload()) return;
    reloading = true;
    markFullReload();
    clearArticlesCache();
    if (typeof PAContentPurge !== 'undefined') {
      try { PAContentPurge.run(); } catch {}
    }
    setTimeout(() => location.reload(), 400);
  }

  async function onContentUpdate() {
    if (isAdminPage()) return;
    const ok = await softRefresh();
    if (!ok) reloadPage();
  }

  function signalUpdate() {
    const payload = JSON.stringify({
      t: Date.now(),
      build: currentBuild(),
      from: isAdminPage() ? 'admin' : 'site'
    });
    try { localStorage.setItem(LS_SIGNAL, payload); } catch {}
  }

  async function checkDeploy() {
    const remote = await fetchRemoteBuild();
    if (!remote) return;

    const local = currentBuild();
    if (!local) {
      knownBuild = remote;
      return;
    }

    if (remote === local) {
      knownBuild = remote;
      try { sessionStorage.setItem(SS_DEPLOY_VER, remote); } catch {}
      return;
    }

    const seen = sessionStorage.getItem(SS_DEPLOY_VER);
    if (seen === remote) return;

    knownBuild = remote;
    try { sessionStorage.setItem(SS_DEPLOY_VER, remote); } catch {}

    const ok = await softRefresh();
    if (!ok && canFullReload()) reloadPage();
  }

  function init() {
    knownBuild = currentBuild();
    window.addEventListener('storage', e => {
      if (e.key === LS_SIGNAL && e.newValue) onContentUpdate();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkDeploy();
    });
    checkDeploy();
    pollTimer = setInterval(checkDeploy, POLL_MS);
  }

  return { init, signalUpdate, checkDeploy, softRefresh };
})();

PAAutoReload.init();