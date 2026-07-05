/**
 * Recarrega abas públicas automaticamente quando:
 * - o admin publica/edita/exclui conteúdo (sinal entre abas)
 * - uma nova versão do site é detectada (poll do purge.js no servidor)
 */
const PAAutoReload = (function () {
  const LS_SIGNAL = 'pa_update_signal';
  const POLL_MS = 30000;
  let knownBuild = null;
  let reloading = false;
  let pollTimer = null;

  function isAdminPage() {
    return /\/pages\/admin\.html/i.test(location.pathname);
  }

  function currentBuild() {
    return document.querySelector('meta[name="pa-build"]')?.content
      || (typeof PAContentPurge !== 'undefined' ? PAContentPurge.VER : null);
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

  function prepareCache() {
    try {
      localStorage.removeItem('pa_articles_cache_v2');
      if (typeof PAContentPurge !== 'undefined') PAContentPurge.run();
    } catch {}
  }

  function reloadPage() {
    if (reloading) return;
    reloading = true;
    prepareCache();
    setTimeout(() => location.reload(), 350);
  }

  function signalUpdate() {
    const payload = JSON.stringify({
      t: Date.now(),
      build: currentBuild(),
      from: isAdminPage() ? 'admin' : 'site'
    });
    try { localStorage.setItem(LS_SIGNAL, payload); } catch {}
    window.dispatchEvent(new CustomEvent('pa-site-update'));
  }

  function onExternalUpdate() {
    if (isAdminPage()) return;
    reloadPage();
  }

  async function checkDeploy() {
    const remote = await fetchRemoteBuild();
    if (!remote) return;
    if (knownBuild && remote !== knownBuild) {
      knownBuild = remote;
      reloadPage();
      return;
    }
    knownBuild = remote;
  }

  function init() {
    knownBuild = currentBuild();
    window.addEventListener('storage', e => {
      if (e.key === LS_SIGNAL && e.newValue) onExternalUpdate();
    });
    window.addEventListener('pa-site-update', onExternalUpdate);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkDeploy();
    });
    window.addEventListener('focus', () => { checkDeploy(); });
    checkDeploy();
    pollTimer = setInterval(checkDeploy, POLL_MS);
  }

  return { init, signalUpdate, checkDeploy };
})();

PAAutoReload.init();