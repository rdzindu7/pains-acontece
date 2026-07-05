const PAEngine = (function () {
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

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

  async function organizeNews(text, hints = {}) {
    if (!text?.trim()) return { error: 'Envie o conteúdo da notícia.' };
    const verification = await PAScanner.verifyText(text);
    const entities = extractEntities(text);
    return {
      title: hints.title || buildTitle(text),
      lead: hints.lead || buildLead(text),
      content: buildContent(text, entities, verification),
      cat: hints.cat || PAScanner.detectCategory(hints.title || buildTitle(text), text),
      img: PAScanner.pickImage(hints.cat || 'Últimas Notícias'),
      author: 'Redação Pains Acontece',
      verified: verification.verified,
      confidence: verification.confidence,
      verification,
      date: new Date().toLocaleDateString('pt-BR'),
      timeAgo: 'Agora'
    };
  }

  async function chat(message, context = {}) {
    const msg = (message || '').trim().toLowerCase();
    if (!msg) return { reply: 'Digite sua mensagem ou cole o texto da notícia.', action: null };

    if (/^(oi|olá|ola|hey|bom dia|boa tarde|boa noite)/.test(msg)) {
      return { reply: 'Olá! Sou a IA do Pains Acontece. Cole a notícia bruta e eu verifico, organizo e preparo o preview.', action: 'greeting' };
    }
    if (/ajuda|help/.test(msg)) {
      return { reply: 'Cole uma pauta · diga "verificar" · use Preview antes de publicar · Exporte o JSON para atualizar o GitHub.', action: 'help' };
    }

    const raw = context.lastDraft || message;
    const verification = await PAScanner.verifyText(raw);

    if (/verificar|confirma|verdadeiro|checar/.test(msg) && msg.length < 80) {
      const src = verification.sources.length
        ? verification.sources.map(s => `• ${s.title} (${s.source})`).join('\n')
        : 'Nenhuma fonte correspondente.';
      return { reply: `${verification.message}\n\nFontes:\n${src}`, action: 'verify', verification };
    }

    const article = await organizeNews(raw, context.hints || {});
    return {
      reply: article.verified
        ? `✓ Verificado (${article.confidence}%)!\n\n**Título:** ${article.title}\n\n**Lead:** ${article.lead}\n\n**Categoria:** ${article.cat}`
        : `⚠ Parcial (${article.confidence}%).\n\n**Título:** ${article.title}\n\n**Lead:** ${article.lead}`,
      action: 'organize', article, verification
    };
  }

  return { chat, organizeNews };
})();