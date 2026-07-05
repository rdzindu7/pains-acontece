/**
 * Limpa cache local quando a versão muda.
 * A cada deploy/atualização: incremente VER (ex.: v18 → v19) para recarregar abas abertas.
 */
const PAContentPurge = (function () {
  const VER = '2026.07.05-v59';

  function run() {
    if (localStorage.getItem('pa_content_purge') === VER) return false;
    try {
      localStorage.removeItem('pa_articles_cache_v2');
      localStorage.removeItem('pa_articles_cache');
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