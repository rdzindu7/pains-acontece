const PAEngine = (function () {
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function isQuestion(msg) {
    return /\?|^(o que|oque|quais|qual|como|quando|onde|quem|me (fale|diga|conta)|noticias|notícias|aconteceu|recente)/i.test(msg);
  }

  function isNewsDraft(msg) {
    return msg.length > 80 || (msg.split(/\n/).length >= 2) || /\.{3}$/.test(msg);
  }

  function extractEntities(text) {
    const places = ['Pains', 'Formiga', 'Piumhi', 'Dores do Indaiá', 'Bambuí', 'Córrego Fundo'];
    const found = places.filter(p => text.toLowerCase().includes(p.toLowerCase()));
    return { places: found.length ? found : ['Pains'] };
  }

  function buildTitle(raw) {
    const s = raw.replace(/\s+/g, ' ').trim().split(/[.!?]+/).filter(Boolean);
    let t = s[0] || raw;
    if (t.length > 90) t = t.slice(0, 87) + '…';
    return cap(t);
  }

  function buildLead(raw) {
    const s = raw.replace(/\s+/g, ' ').trim().split(/[.!?]+/).filter(x => x.trim().length > 20);
    const l = s[0] || raw;
    return (l.length > 200 ? l.slice(0, 197) + '…' : cap(l.trim())) + (l.endsWith('.') ? '' : '.');
  }

  function buildContent(raw, entities, verification) {
    const html = raw.split(/\n+/).filter(p => p.trim()).map(p => `<p>${cap(p.trim())}</p>`).join('');
    const note = verification.verified
      ? `<p><em>✓ Verificado pela IA — confiança ${verification.confidence}%.</em></p>`
      : `<p><em>⚠ Verificação parcial (${verification.confidence}%). Revise antes de publicar.</em></p>`;
    return `<p><strong>${entities.places.join(', ')}</strong> — ${buildLead(raw).replace(/\.$/, '')}, segundo informações da redação.</p>` + html + note;
  }

  async function answerQuestion(message) {
    const [published, headlines, verification] = await Promise.all([
      PAScanner.searchPublished(message, 6),
      PAScanner.searchHeadlines(message, 6),
      PAScanner.verifyText(message)
    ]);

    const lines = [];
    const msg = message.toLowerCase();

    if (/clima|tempo|previsão|previsao/.test(msg)) {
      return {
        reply: 'A previsão do tempo de **Pains MG** está na aba **Clima** do menu, atualizada via Open-Meteo (temperatura, umidade, vento e 5 dias).',
        action: 'weather',
        verification
      };
    }

    if (published.length) {
      lines.push('**Notícias no portal:**');
      published.forEach((a, i) => {
        lines.push(`${i + 1}. **${a.title}** (${a.cat}) — ${a.timeAgo || a.date}${a.verified ? ' ✓' : ''}`);
      });
    }

    if (headlines.length) {
      lines.push('', '**Fontes monitoradas agora:**');
      headlines.slice(0, 5).forEach((h, i) => {
        lines.push(`${i + 1}. ${h.title} — _${h.source}_`);
      });
    }

    if (!published.length && !headlines.length) {
      if (verification.feedsLoaded === 0) {
        return {
          reply: 'Não consegui acessar os feeds no momento. Clique em **Buscar Agora** no assistente IA para forçar uma nova varredura em Pains, região, Brasil e mundo.',
          action: 'scan', verification
        };
      }
      return {
        reply: 'Não encontrei matérias específicas para essa pergunta agora. Tente **Buscar Agora** para atualizar as fontes, ou reformule (ex: "notícias de Pains MG", "região Formiga").',
        action: 'search_empty', verification
      };
    }

    const intro = /pains/.test(msg)
      ? 'Aqui está o que monitoramos sobre **Pains MG** e região:'
      : 'Com base nas fontes verificadas do portal:';

    return {
      reply: `${intro}\n\n${lines.join('\n')}\n\n_Confiança da análise: ${verification.confidence}% — ${verification.sources.length} fonte(s)._`,
      action: 'answer',
      verification,
      articles: published,
      headlines
    };
  }

  async function organizeNews(text, hints = {}) {
    if (!text?.trim()) return { error: 'Envie o conteúdo da notícia.' };
    const verification = await PAScanner.verifyText(text);
    const entities = extractEntities(text);
    const cat = hints.cat || PAScanner.detectCategory(hints.title || buildTitle(text), text);
    let img = hints.img || '';
    if (!img && verification.sources?.length) {
      const src = verification.sources.find(s => s.url && !s.local);
      if (src) {
        img = await PAScanner.resolveItemImage({ summary: text, link: src.url, title: hints.title || buildTitle(text) }, cat);
      }
    }
    if (!img) img = PAScanner.pickImage(cat);
    return {
      title: hints.title || buildTitle(text),
      lead: hints.lead || buildLead(text),
      content: buildContent(text, entities, verification),
      cat, img,
      author: 'Redação Pains Acontece',
      verified: verification.verified,
      confidence: verification.confidence,
      verification,
      date: new Date().toLocaleDateString('pt-BR'),
      timeAgo: 'Agora'
    };
  }

  async function chat(message, context = {}) {
    if (typeof PAOrchestrator !== 'undefined') {
      return PAOrchestrator.process(message, context);
    }
    const msg = (message || '').trim();
    if (!msg) return { reply: 'Digite sua mensagem.', action: null };
    if (isQuestion(msg.toLowerCase()) || (!isNewsDraft(msg) && msg.length < 100)) {
      return answerQuestion(msg);
    }
    const article = await organizeNews(context.lastDraft || msg, context.hints || {});
    return {
      reply: `**Título:** ${article.title}\n\n**Lead:** ${article.lead}`,
      action: 'organize',
      article,
      verification: article.verification
    };
  }

  return { chat, organizeNews, answerQuestion };
})();