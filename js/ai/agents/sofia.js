const PASofia = (function () {
  const PROFILE = {
    id: 'sofia',
    name: 'Sofia Mendes',
    role: 'Coordenadora de Atendimento',
    icon: 'fa-headset',
    color: '#5dade2'
  };

  const SEARCH_RE = /^(buscar|varrer|scanner|atualizar|pesquisar|procurar)(\s|$)|buscar\s+(noticia|notícia|agora|hoje)|noticias?\s+(de\s+)?(hoje|agora)|o\s+que\s+aconteceu|ultimas?\s+noticias?|novidades?\s+(em|de)|tem\s+noticia/i;
  const NEWS_RE = /noticia|notícia|aconteceu|recente|pains|formiga|piumhi|regi[aã]o|brasil|mundo|pol[ií]tica|pol[ií]cia|sa[uú]de|prefeitura|vereador|prefeito|fato|den[uú]ncia|manchete/i;
  const VERIFY_RE = /^verificar\b/i;
  const WEATHER_RE = /clima|tempo|previs[aã]o|chuva|temperatura/i;

  function classify(message) {
    const msg = (message || '').trim();
    const low = msg.toLowerCase();
    if (!msg) return { intent: 'empty', query: '' };
    if (/^(oi|olá|ola|hey|bom dia|boa tarde|boa noite|e aí|eai)/.test(low)) return { intent: 'greeting', query: msg };
    if (/ajuda|help|comandos|quem (é|e) voc/.test(low)) return { intent: 'help', query: msg };
    if (WEATHER_RE.test(low)) return { intent: 'weather', query: msg };
    if (VERIFY_RE.test(low)) return { intent: 'verify', query: msg.replace(/^verificar[:\s]*/i, '').trim() || msg };
    if (SEARCH_RE.test(low) || /^buscar$/i.test(low)) return { intent: 'scan', query: msg };
    if (NEWS_RE.test(low) || /\?/.test(msg)) return { intent: 'question', query: msg };
    if (msg.length > 80 || msg.split(/\n/).length >= 2) return { intent: 'organize', query: msg };
    return { intent: 'question', query: msg };
  }

  function route(classification) {
    const { intent } = classification;
    if (intent === 'greeting' || intent === 'help' || intent === 'empty') {
      return { primary: 'sofia', pipeline: ['sofia'] };
    }
    if (intent === 'weather') {
      return { primary: 'sofia', pipeline: ['sofia'] };
    }
    if (intent === 'scan') {
      return { primary: 'lucas', pipeline: ['sofia', 'lucas', 'camila'], autoPublish: true };
    }
    if (intent === 'verify') {
      return { primary: 'lucas', pipeline: ['sofia', 'lucas', 'camila'] };
    }
    if (intent === 'organize') {
      return { primary: 'camila', pipeline: ['sofia', 'lucas', 'camila'] };
    }
    return { primary: 'lucas', pipeline: ['sofia', 'lucas', 'camila'], needsSearch: true };
  }

  function greet() {
    return {
      agent: PROFILE,
      reply: `Olá! Sou **${PROFILE.name}**, ${PROFILE.role} da redação.\n\nTrabalho em equipe com:\n• **Lucas Ferreira** — Analista de Fontes (busca e verificação)\n• **Camila Rocha** — Editora-Chefe (organiza e publica)\n\nPergunte sobre Pains, região, Brasil ou mundo — ou digite **buscar** para varredura completa.`,
      action: 'greeting'
    };
  }

  function help() {
    return {
      agent: PROFILE,
      reply: `**Equipe IA Pains Acontece:**\n\n**${PROFILE.name}** — recebe você e direciona a demanda\n**Lucas Ferreira** — varre RSS, cruza fontes e verifica fatos\n**Camila Rocha** — monta matérias e publica no portal\n\n• Perguntas sobre notícias → Lucas busca automaticamente\n• **buscar** → varredura completa + publicação\n• Cole um texto → Camila organiza a matéria`,
      action: 'help'
    };
  }

  function weather() {
    return {
      agent: PROFILE,
      reply: 'A previsão de **Pains MG** está na aba **Clima** do menu, com dados reais do Open-Meteo.',
      action: 'weather'
    };
  }

  function ack(classification, routePlan) {
    const labels = {
      scan: 'Vou acionar o **Lucas Ferreira** para varredura completa nas fontes. A **Camila Rocha** publica o que for aprovado.',
      question: 'Encaminhando para **Lucas Ferreira** buscar nas fontes. **Camila Rocha** prepara a resposta.',
      verify: 'Solicitando verificação ao **Lucas Ferreira**. **Camila** resume os resultados.',
      organize: '**Lucas** verifica os fatos e **Camila Rocha** organiza a matéria.',
      empty: 'Digite sua pergunta ou **buscar** para atualizar o portal.'
    };
    return {
      agent: PROFILE,
      reply: labels[classification.intent] || labels.question,
      action: 'route',
      route: routePlan
    };
  }

  return { PROFILE, classify, route, greet, help, weather, ack };
})();