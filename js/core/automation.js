/**
 * Automação global — sem perguntas, sem passos manuais.
 */
const PAAutomation = (function () {
  function cfg() {
    return (typeof PAConfig !== 'undefined' && PAConfig.automation) || {};
  }

  function on(key, fallback) {
    const v = cfg()[key];
    return v === undefined ? fallback : !!v;
  }

  function refreshMs() {
    const m = Number(cfg().refreshMinutes);
    return (m > 0 ? m : 5) * 60 * 1000;
  }

  function scanMs() {
    const m = Number(cfg().scanMinutes);
    return (m > 0 ? m : 5) * 60 * 1000;
  }

  return {
    silent: () => on('silentMode', true),
    autoScan: () => on('autoScan', true),
    autoRefresh: () => on('autoRefresh', true),
    autoSync: () => on('autoSync', true),
    autoPublishEmpty: () => on('autoPublishIfEmpty', true),
    refreshMs,
    scanMs
  };
})();