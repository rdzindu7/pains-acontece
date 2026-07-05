const PAOrchestrator = (function () {
  let onAgent = null;

  function setAgentCallback(fn) {
    onAgent = fn;
  }

  function emit(agent, status) {
    if (onAgent) onAgent({ agent, status });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pa-ia-agent', { detail: { agent, status } }));
    }
  }

  async function process(message, context = {}) {
    const classification = PASofia.classify(message);
    const routePlan = PASofia.route(classification);

    if (classification.intent === 'empty') {
      return { ...PASofia.greet(), action: 'empty' };
    }
    if (classification.intent === 'greeting') {
      return PASofia.greet();
    }
    if (classification.intent === 'help') {
      return PASofia.help();
    }
    if (classification.intent === 'weather') {
      return PASofia.weather();
    }

    emit(PASofia.PROFILE, 'Roteando demanda…');

    if (classification.intent === 'scan') {
      emit(PALucas.PROFILE, 'Iniciando varredura completa…');
      const lucasData = await PALucas.scanFull(true);
      if (typeof PAStore !== 'undefined') await PAStore.init().catch(() => {});
      if (typeof window.PAHomeRefresh === 'function') window.PAHomeRefresh();
      emit(PACamila.PROFILE, 'Publicando matérias aprovadas…');
      return PACamila.presentScan(lucasData);
    }

    if (classification.intent === 'verify') {
      emit(PALucas.PROFILE, 'Verificando fatos nas fontes…');
      const lucasData = await PALucas.verify(classification.query);
      emit(PACamila.PROFILE, 'Preparando relatório…');
      return PACamila.presentVerify(lucasData);
    }

    if (classification.intent === 'organize') {
      emit(PALucas.PROFILE, 'Checando fatos do texto…');
      const lucasData = await PALucas.verify(message);
      emit(PACamila.PROFILE, 'Organizando matéria…');
      return PACamila.organize(message, lucasData, context.hints || {});
    }

    emit(PALucas.PROFILE, 'Buscando nas fontes e no portal…');
    const lucasData = await PALucas.investigate(classification.query);
    emit(PACamila.PROFILE, 'Montando resposta editorial…');
    const result = PACamila.present(lucasData, classification);

    if (result.autoScan && routePlan.needsSearch !== false) {
      result._followUpScan = true;
    }
    return result;
  }

  async function runScan(force) {
    emit(PALucas.PROFILE, 'Varredura em andamento…');
    const lucasData = await PALucas.scanFull(!!force);
    if (typeof PAStore !== 'undefined') await PAStore.init().catch(() => {});
    if (typeof window.PAHomeRefresh === 'function') window.PAHomeRefresh();
    emit(PACamila.PROFILE, 'Finalizando publicação…');
    return PACamila.presentScan(lucasData);
  }

  function getTeam() {
    return [PASofia.PROFILE, PALucas.PROFILE, PACamila.PROFILE];
  }

  return { process, runScan, setAgentCallback, getTeam };
})();