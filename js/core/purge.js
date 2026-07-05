/** Limpa publicações e cache local quando a versão de conteúdo muda. */
const PAContentPurge = (function () {
  const VER = '2026.07.05-v17';

  function run() {
    if (localStorage.getItem('pa_content_purge') === VER) return false;
    try {
      const state = JSON.parse(localStorage.getItem('pa_admin_state_v2') || '{}');
      state.articles = [];
      state.deleted = [];
      state.pending = [];
      if (state.scanner) {
        state.scanner.seen_urls = [];
        state.scanner.last_scan = null;
      }
      localStorage.setItem('pa_admin_state_v2', JSON.stringify(state));
      localStorage.removeItem('pa_articles_cache_v2');
      localStorage.setItem('pa_content_purge', VER);
      localStorage.setItem('pa_content_reset', VER);
      return true;
    } catch {
      return false;
    }
  }

  return { run, VER };
})();

PAContentPurge.run();