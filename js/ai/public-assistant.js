const PAPublicIA = (function () {
  let open = false;
  let scanning = false;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function fmt(text) {
    return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  function isOwnerMode() {
    return typeof PAAPI !== 'undefined' && PAAPI.isOwner();
  }

  function articlePath(id) {
    const base = location.pathname.includes('/pages/') ? 'noticia.html' : 'pages/noticia.html';
    return `${base}?id=${id}`;
  }

  function agentBadge(agent) {
    if (!agent) return '';
    return `<div class="papia-agent-tag" style="--ag-color:${agent.color}">
      <i class="fas ${agent.icon}"></i> <strong>${esc(agent.name)}</strong> · ${esc(agent.role)}
    </div>`;
  }

  function injectStyles() {
    if (document.getElementById('papia-styles')) return;
    const s = document.createElement('style');
    s.id = 'papia-styles';
    s.textContent = `
      .papia-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:7999;opacity:0;pointer-events:none;transition:opacity .3s}
      .papia-backdrop.open{opacity:1;pointer-events:all}
      .papia-fab{
        position:fixed;bottom:calc(20px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));
        width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#1d7a1d,#0d4d0d);
        border:2px solid rgba(201,162,39,.4);color:#fff;font-size:1.2rem;cursor:pointer;
        box-shadow:0 4px 24px rgba(29,122,29,.55);z-index:8000;
        transition:transform .3s,box-shadow .3s,opacity .3s;display:flex;align-items:center;justify-content:center;
        -webkit-tap-highlight-color:transparent;touch-action:manipulation;
      }
      .papia-fab:hover{transform:scale(1.08) rotate(-3deg);box-shadow:0 8px 32px rgba(29,122,29,.75)}
      .papia-fab.hidden{opacity:0;pointer-events:none;transform:scale(.85)}
      .papia-fab .dot{position:absolute;top:6px;right:6px;width:10px;height:10px;background:#2ecc2e;border-radius:50%;border:2px solid #080808;animation:papiaPulse 1.5s ease infinite}
      @keyframes papiaPulse{0%,100%{opacity:1}50%{opacity:.4}}
      .papia-panel{
        position:fixed;bottom:calc(88px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));
        width:min(420px,calc(100vw - 40px));height:min(560px,calc(100vh - 120px));max-height:calc(100dvh - 100px);
        background:rgba(8,8,8,.97);border:1px solid rgba(29,122,29,.35);border-radius:12px;
        box-shadow:0 24px 80px rgba(0,0,0,.85);z-index:8001;display:flex;flex-direction:column;
        transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;visibility:hidden;
        transition:transform .35s cubic-bezier(.16,1,.3,1),opacity .35s,visibility .35s;overflow:hidden;backdrop-filter:blur(16px);
      }
      .papia-panel.open{transform:none;opacity:1;pointer-events:all;visibility:visible}
      .papia-head{padding:12px 14px;background:linear-gradient(90deg,rgba(13,77,13,.9),rgba(8,8,8,.5));border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px;flex-shrink:0}
      .papia-head .av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#1d7a1d,#2ecc2e);display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .papia-head .meta{flex:1;min-width:0}
      .papia-head h4{font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px;font-size:1.05rem;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .papia-head .sub{font-size:.55rem;color:rgba(255,255,255,.45);letter-spacing:.8px;text-transform:uppercase}
      .papia-head button{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:1rem;padding:8px;flex-shrink:0}
      .papia-team{display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.04);background:rgba(0,0,0,.2);flex-shrink:0}
      .papia-team-member{flex:1;min-width:0;text-align:center;padding:6px 4px;border-radius:6px;border:1px solid rgba(255,255,255,.06);font-size:.52rem;color:rgba(255,255,255,.4);transition:all .3s}
      .papia-team-member i{display:block;font-size:.75rem;margin-bottom:3px}
      .papia-team-member strong{display:block;font-size:.58rem;letter-spacing:.5px;color:rgba(255,255,255,.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .papia-team-member.active{border-color:var(--ag-c,var(--g));background:rgba(29,122,29,.12);color:#fff;box-shadow:0 0 12px rgba(29,122,29,.2)}
      .papia-team-member.active strong{color:var(--ag-c,#2ecc2e)}
      .papia-msgs{flex:1;min-height:0;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}
      .papia-msg{max-width:92%;padding:10px 14px;border-radius:10px;font-size:.78rem;line-height:1.55;word-break:break-word}
      .papia-msg.bot{background:rgba(29,122,29,.12);border:1px solid rgba(29,122,29,.25);align-self:flex-start}
      .papia-msg.user{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);align-self:flex-end}
      .papia-msg.typing{color:rgba(255,255,255,.4);font-style:italic}
      .papia-agent-tag{font-size:.58rem;color:var(--ag-color,#2ecc2e);margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
      .papia-agent-tag i{opacity:.85}
      .papia-actions{padding:8px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px;border-top:1px solid rgba(255,255,255,.04);flex-shrink:0}
      .papia-act{font-size:.58rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:8px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);cursor:pointer;transition:all .2s;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-tap-highlight-color:transparent}
      .papia-act:hover,.papia-act:active{background:rgba(29,122,29,.2);color:#2ecc2e;border-color:rgba(29,122,29,.35)}
      .papia-foot{padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;gap:8px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;align-items:center}
      .papia-foot input{flex:1;min-width:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#fff;font-size:.78rem;outline:none}
      .papia-foot input:focus{border-color:#1d7a1d}
      .papia-foot button{width:44px;height:44px;border-radius:8px;background:#1d7a1d;border:none;color:#fff;cursor:pointer;flex-shrink:0}
      .papia-link{color:var(--g3);text-decoration:underline;font-weight:600}
      @media(min-width:601px){
        .papia-actions{display:flex;flex-wrap:wrap;gap:6px}
        .papia-act{width:auto;padding:6px 11px;border-radius:20px}
      }
      @media(max-width:600px){
        .papia-panel.open{inset:0;width:100%;max-width:100%;height:100%;max-height:100%;height:100dvh;bottom:0;right:0;border-radius:0;border:none}
        .papia-fab{right:calc(14px + env(safe-area-inset-right));bottom:calc(16px + env(safe-area-inset-bottom));width:50px;height:50px}
        .papia-head{padding-top:calc(12px + env(safe-area-inset-top))}
        .papia-actions{padding:10px 12px;gap:8px}
        .papia-act{padding:10px 6px}
        body.pa-has-padiv .papia-fab{bottom:calc(80px + env(safe-area-inset-bottom))}
      }
    `;
    document.head.appendChild(s);
  }

  function syncOpenState() {
    const panel = document.getElementById('papiaPanel');
    const fab = document.getElementById('papiaFab');
    const backdrop = document.getElementById('papiaBackdrop');
    const mobile = window.innerWidth <= 600;
    panel?.classList.toggle('open', open);
    backdrop?.classList.toggle('open', open && mobile);
    fab?.classList.toggle('hidden', open && mobile);
    document.body.style.overflow = open && mobile ? 'hidden' : '';
    if (open) setTimeout(() => document.getElementById('papiaInput')?.focus(), 100);
  }

  function setActiveAgent(agentId) {
    document.querySelectorAll('.papia-team-member').forEach(el => {
      el.classList.toggle('active', el.dataset.agent === agentId);
    });
  }

  function addMsg(role, html, agent) {
    const msgs = document.getElementById('papiaMsgs');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'papia-msg ' + role;
    div.innerHTML = (agent && role === 'bot' ? agentBadge(agent) : '') + html;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function toggle(force) {
    open = typeof force === 'boolean' ? force : !open;
    syncOpenState();
  }

  async function ensureArticles() {
    if (typeof PAStore === 'undefined') return [];
    if (!PAStore.getArticles('pub').length) await PAStore.init().catch(() => {});
    return PAStore.getArticles('pub') || [];
  }

  function stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function findArticles(query, limit = 5) {
    const arts = typeof PAStore !== 'undefined' ? PAStore.getArticles('pub') : [];
    const current = window.PACurrentArticle;
    const q = (query || '').toLowerCase().trim();
    const stop = new Set(['o','a','os','as','de','da','do','das','dos','em','no','na','que','qual','quais','como','sobre','noticia','notícia','esta','esse','essa','me','um','uma','é','e']);
    const words = q.split(/\s+/).filter(w => w.length > 2 && !stop.has(w));

    if (/esta|esse|essa|matéria|materia|publicação|publicacao|notícia atual|noticia atual/i.test(q) && current) {
      return [current];
    }

    const scored = arts.map(a => {
      const plain = stripHtml(a.content);
      const text = `${a.title} ${a.lead || ''} ${a.cat} ${plain}`.toLowerCase();
      let score = 0;
      words.forEach(w => { if (text.includes(w)) score += 3; });
      if (q && text.includes(q)) score += 8;
      if (current && String(a.id) === String(current.id)) score += 10;
      return { a, score };
    }).filter(x => x.score > 0).sort((x, y) => y.score - x.score);

    return scored.slice(0, limit).map(x => x.a);
  }

  function formatArticleAnswer(articles, intro) {
    if (!articles.length) {
      return {
        agent: PASofia?.PROFILE,
        reply: 'Não encontrei uma publicação sobre isso no portal. Tente descrever o assunto com outras palavras ou pergunte pelas <strong>últimas notícias</strong>.'
      };
    }
    const lines = [intro || 'Encontrei estas publicações que podem ajudar:'];
    articles.forEach((a, i) => {
      const lead = (a.lead || stripHtml(a.content).slice(0, 160) || a.title).trim();
      const link = articlePath(a.id);
      lines.push(`<br><br><strong>${i + 1}. ${esc(a.title)}</strong> <span style="color:rgba(255,255,255,.4)">(${esc(a.cat)})</span><br>${esc(lead)}${lead.length >= 160 ? '…' : ''}<br><a class="papia-link" href="${link}">Ler matéria completa →</a>`);
    });
    lines.push(`<br><br><span style="font-size:.65rem;color:rgba(255,255,255,.4)">— ${PACamila?.PROFILE?.name || 'Equipe editorial'}</span>`);
    return { agent: PACamila?.PROFILE || PASofia?.PROFILE, reply: lines.join('') };
  }

  async function processPublic(msg) {
    const classification = typeof PASofia !== 'undefined' ? PASofia.classify(msg) : { intent: 'question', query: msg };
    const low = msg.toLowerCase();

    if (classification.intent === 'greeting' || /^(oi|olá|ola|hey|bom dia|boa tarde|boa noite)/.test(low)) {
      setActiveAgent('sofia');
      return {
        agent: PASofia?.PROFILE,
        reply: 'Olá! Sou a <strong>Sofia Mendes</strong>, da equipe do Pains Acontece.<br><br>Tire dúvidas sobre <strong>qualquer publicação</strong> do portal — é só perguntar! A <strong>Camila</strong> explica as matérias e o <strong>Lucas</strong> confere os fatos nas fontes.'
      };
    }

    if (classification.intent === 'help') {
      setActiveAgent('sofia');
      return {
        agent: PASofia?.PROFILE,
        reply: '**Como podemos ajudar:**<br>• Pergunte sobre uma notícia específica<br>• Peça resumo de uma matéria<br>• Consulte as últimas publicações<br>• Tire dúvidas sobre Pains e região<br><br>Exemplo: <em>"O que diz a notícia sobre a prefeitura?"</em>'
      };
    }

    if (classification.intent === 'weather' || /clima|tempo|chuva/.test(low)) {
      setActiveAgent('sofia');
      return typeof PASofia !== 'undefined' ? PASofia.weather() : { agent: PASofia?.PROFILE, reply: 'Veja a previsão na aba Clima do menu.' };
    }

    if (/selo|verificad|badge|conta verificada|credibilidade/.test(low)) {
      setActiveAgent('sofia');
      const plan = PAConfig?.verifiedPlan || {};
      const price = (plan.price || 29.9).toFixed(2).replace('.', ',');
      const benefits = (plan.benefits || []).map(b => `• <strong>${esc(b.title)}</strong> — ${esc(b.desc)}`).join('<br>');
      const verPath = location.pathname.includes('/pages/') ? 'verificado.html' : 'pages/verificado.html';
      const logged = typeof PASocial !== 'undefined' && PASocial.isLoggedIn?.();
      const hasBadge = logged && PASocial.isVerified?.(PASocial.getProfile?.());
      let cta = hasBadge
        ? 'Você já possui o selo ativo no seu perfil!'
        : logged
          ? `Solicite agora em <a class="papia-link" href="${verPath}">Selo Verificado</a> — investimento de <strong>R$ ${price}/ano</strong>.`
          : `Entre com Google em <a class="papia-link" href="${location.pathname.includes('/pages/') ? 'entrar.html' : 'pages/entrar.html'}">Entrar</a> e depois solicite em <a class="papia-link" href="${verPath}">Selo Verificado</a>.`;
      return {
        agent: PASofia?.PROFILE,
        reply: `<strong>Selo Verificado Pains Acontece</strong><br><br>Identidade reconhecida exclusivamente pelo proprietário do portal. Benefícios:<br><br>${benefits || '• Selo no perfil<br>• Comentários em destaque'}<br><br>${cta}<br><br><span style="font-size:.65rem;color:rgba(255,255,255,.4)">Aprovação feita somente por admin@painsacontece.com.br</span>`
      };
    }

    if (/últim|ultim|recente|hoje|novidade/.test(low)) {
      setActiveAgent('lucas');
      const arts = await ensureArticles();
      const latest = arts.slice(0, 5);
      return formatArticleAnswer(latest, 'Estas são as <strong>últimas publicações</strong> do portal:');
    }

    if (window.PACurrentArticle && /resum|explic|entend|detalh|sobre esta|desta matéria/.test(low)) {
      setActiveAgent('camila');
      const a = window.PACurrentArticle;
      const summary = a.lead || stripHtml(a.content).slice(0, 400);
      return {
        agent: PACamila?.PROFILE,
        reply: `**${esc(a.title)}**<br><br>${esc(summary)}${summary.length >= 400 ? '…' : ''}<br><br><span style="font-size:.72rem;color:rgba(255,255,255,.5)">Categoria: ${esc(a.cat)} · ${esc(a.date || '')}</span><br><br>Se quiser mais detalhes, leia a <a class="papia-link" href="${articlePath(a.id)}">matéria completa</a>.`
      };
    }

    setActiveAgent('lucas');
    const matches = findArticles(msg);
    if (matches.length) {
      setActiveAgent('camila');
      return formatArticleAnswer(matches, 'Com base nas publicações do portal:');
    }

    setActiveAgent('sofia');
    const all = await ensureArticles();
    if (!all.length) {
      return { agent: PASofia?.PROFILE, reply: 'Ainda não há publicações no portal. Volte em breve — estamos preparando novidades sobre Pains e região!' };
    }

    return {
      agent: PASofia?.PROFILE,
      reply: `Não localizei uma matéria exata sobre "<strong>${esc(msg)}</strong>".<br><br>Tente reformular ou pergunte pelas <strong>últimas notícias</strong>. Estamos aqui para esclarecer qualquer publicação!`
    };
  }

  async function runSearch() {
    if (!isOwnerMode()) {
      addMsg('bot', 'A busca automática de notícias é exclusiva da redação. <strong>Pergunte sobre qualquer publicação</strong> que já está no portal — estamos prontos para ajudar!', PASofia?.PROFILE);
      return;
    }
    if (scanning) return;
    scanning = true;
    setActiveAgent('lucas');
    addMsg('bot', '<i class="fas fa-satellite-dish"></i> Varredura completa iniciada…', PALucas?.PROFILE);

    const onProgress = (e) => { if (e.detail && scanning) setActiveAgent('lucas'); };
    window.addEventListener('pa-deep-verify', onProgress);

    PAOrchestrator?.setAgentCallback?.(({ agent, status }) => {
      setActiveAgent(agent?.id);
      const el = document.querySelector('#papiaMsgs .papia-msg.bot:last-child');
      if (el && scanning && status) {
        el.innerHTML = agentBadge(agent) + `<i class="fas ${agent?.icon || 'fa-spinner fa-spin'}"></i> ${esc(status)}`;
      }
    });

    try {
      const res = typeof PAOrchestrator !== 'undefined' ? await PAOrchestrator.runScan(true) : null;
      if (res) {
        setActiveAgent('camila');
        let extra = '';
        if (res.verification) {
          extra = `<br><span style="font-size:.65rem;color:#2ecc2e">✓ ${res.verification.confidence || 0}% · ${res.verification.sources?.length || 0} fonte(s)</span>`;
        }
        addMsg('bot', fmt(res.reply) + extra, res.agent);
      }
    } catch {
      addMsg('bot', 'Não foi possível concluir a varredura. Verifique sua conexão.', PASofia?.PROFILE);
    }

    window.removeEventListener('pa-deep-verify', onProgress);
    setActiveAgent('sofia');
    scanning = false;
  }

  async function sendDirect(text) {
    const input = document.getElementById('papiaInput');
    if (input) input.value = text;
    await send();
  }

  async function send() {
    const input = document.getElementById('papiaInput');
    const msg = (input?.value || '').trim();
    if (!msg) return;
    addMsg('user', esc(msg));
    input.value = '';

    const owner = isOwnerMode();
    const classification = typeof PASofia !== 'undefined' ? PASofia.classify(msg) : { intent: 'question' };
    const isScan = classification.intent === 'scan' || /^(buscar|varrer|scanner|atualizar)(\s|$)/i.test(msg);

    if (isScan) {
      await runSearch();
      return;
    }

    setActiveAgent('sofia');
    const typing = document.createElement('div');
    typing.className = 'papia-msg bot typing';
    typing.innerHTML = agentBadge(PASofia?.PROFILE) + (owner ? 'Encaminhando para a equipe…' : 'Consultando publicações do portal…');
    document.getElementById('papiaMsgs')?.appendChild(typing);

    try {
      await ensureArticles();

      const res = owner && typeof PAOrchestrator !== 'undefined'
        ? await PAOrchestrator.process(msg, {})
        : await processPublic(msg);

      typing.remove();
      setActiveAgent(res.agent?.id || 'sofia');

      let extra = '';
      if (owner && res.verification && res.action !== 'greeting' && res.action !== 'help') {
        const ok = res.verification.verified;
        extra = `<br><span style="font-size:.65rem;color:${ok ? '#2ecc2e' : '#c9a227'}">${ok ? '✓' : '◆'} ${res.verification.confidence}% · ${res.verification.sources?.length || 0} fonte(s)</span>`;
      }

      addMsg('bot', (owner ? fmt(res.reply) : res.reply) + extra, res.agent);

      if (owner && res._followUpScan && !scanning) {
        addMsg('bot', 'Iniciando varredura automática…', PALucas?.PROFILE);
        await runSearch();
      }
    } catch {
      typing?.remove();
      addMsg('bot', 'Erro ao processar. Tente perguntar de outra forma.', PASofia?.PROFILE);
    }

    setActiveAgent('sofia');
  }

  function quick(cmd) {
    if (cmd === 'buscar') { runSearch(); return; }
    if (cmd === 'ultimas') { sendDirect('Quais são as últimas notícias publicadas?'); return; }
    if (cmd === 'explicar' && window.PACurrentArticle) {
      sendDirect('Explique e resuma esta matéria para mim');
      return;
    }
    if (cmd === 'pains') { sendDirect('Quais notícias recentes sobre Pains MG?'); return; }
    if (cmd === 'mundo') { sendDirect('Quais notícias internacionais do mundo?'); return; }
    if (cmd === 'clima') { sendDirect('como está o clima em Pains?'); return; }
    if (cmd === 'duvida') { sendDirect('Tenho uma dúvida sobre uma publicação'); return; }
    if (cmd === 'verificado') { sendDirect('Quero saber sobre o selo verificado e seus benefícios'); return; }
    const input = document.getElementById('papiaInput');
    if (input?.value.trim()) send();
  }

  function teamHtml() {
    const team = typeof PAOrchestrator !== 'undefined' ? PAOrchestrator.getTeam() : [
      { id: 'sofia', name: 'Sofia Mendes', role: 'Atendimento', icon: 'fa-headset', color: '#5dade2' },
      { id: 'lucas', name: 'Lucas Ferreira', role: 'Fontes', icon: 'fa-search', color: '#2ecc71' },
      { id: 'camila', name: 'Camila Rocha', role: 'Editora', icon: 'fa-pen-nib', color: '#c9a227' }
    ];
    return team.map(a => `
      <div class="papia-team-member" data-agent="${a.id}" style="--ag-c:${a.color}">
        <i class="fas ${a.icon}"></i>
        <strong>${esc(a.name.split(' ')[0])}</strong>
        ${esc((a.role || '').split(' ')[0])}
      </div>`).join('');
  }

  function actionsHtml() {
    const onArticle = !!window.PACurrentArticle;
    if (isOwnerMode()) {
      return `
        <button type="button" class="papia-act" onclick="PAPublicIA.quick('buscar')"><i class="fas fa-rss"></i> Buscar Agora</button>
        <button type="button" class="papia-act" onclick="PAPublicIA.quick('ultimas')">Últimas</button>
        <button type="button" class="papia-act" onclick="PAPublicIA.quick('pains')">Pains MG</button>
        <button type="button" class="papia-act" onclick="PAPublicIA.quick('clima')">Clima</button>`;
    }
    return `
      <button type="button" class="papia-act" onclick="PAPublicIA.quick('ultimas')"><i class="fas fa-newspaper"></i> Últimas</button>
      ${onArticle ? '<button type="button" class="papia-act" onclick="PAPublicIA.quick(\'explicar\')">Explicar matéria</button>' : ''}
      <button type="button" class="papia-act" onclick="PAPublicIA.quick('verificado')"><i class="fas fa-check-circle"></i> Selo</button>
      <button type="button" class="papia-act" onclick="PAPublicIA.quick('pains')">Pains</button>
      <button type="button" class="papia-act" onclick="PAPublicIA.quick('clima')">Clima</button>
      <button type="button" class="papia-act" onclick="PAPublicIA.quick('duvida')">Tirar dúvida</button>`;
  }

  function welcomeMsg() {
    if (isOwnerMode()) {
      return 'Somos a <strong>equipe IA editorial</strong> do Pains Acontece:<br><br>• <strong>Sofia Mendes</strong> recebe você<br>• <strong>Lucas Ferreira</strong> busca e verifica fontes<br>• <strong>Camila Rocha</strong> edita e explica matérias<br><br>Pergunte sobre notícias ou use <strong>buscar</strong> para varredura completa.';
    }
    if (window.PACurrentArticle) {
      const t = esc(window.PACurrentArticle.title);
      return `Olá! Somos a <strong>equipe de atendimento</strong> do Pains Acontece.<br><br>Tire dúvidas sobre <strong>qualquer publicação</strong> — inclusive esta: <em>${t}</em>.<br><br>Pergunte o que quiser, estamos aqui para ajudar!`;
    }
    return 'Olá! Somos a <strong>equipe de atendimento</strong> do Pains Acontece — <strong>Sofia</strong>, <strong>Lucas</strong> e <strong>Camila</strong>.<br><br>Tire dúvidas sobre <strong>qualquer publicação</strong> do portal. É só perguntar!';
  }

  function createUI() {
    if (document.getElementById('papiaPanel')) return;
    injectStyles();

    const backdrop = document.createElement('div');
    backdrop.className = 'papia-backdrop';
    backdrop.id = 'papiaBackdrop';
    backdrop.addEventListener('click', () => { if (open) toggle(false); });

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'papia-fab';
    fab.id = 'papiaFab';
    fab.title = 'Equipe IA — Tire suas dúvidas';
    fab.setAttribute('aria-label', 'Abrir equipe IA');
    fab.innerHTML = '<i class="fas fa-users"></i><span class="dot"></span>';
    fab.addEventListener('click', () => toggle());

    const panel = document.createElement('div');
    panel.className = 'papia-panel';
    panel.id = 'papiaPanel';
    panel.innerHTML = `
      <div class="papia-head">
        <div class="av"><i class="fas fa-users"></i></div>
        <div class="meta">
          <h4>${isOwnerMode() ? 'Equipe IA Editorial' : 'Tire suas dúvidas'}</h4>
          <div class="sub">Sofia · Lucas · Camila</div>
        </div>
        <button type="button" onclick="PAPublicIA.toggle(false)" title="Fechar" aria-label="Fechar"><i class="fas fa-times"></i></button>
      </div>
      <div class="papia-team" id="papiaTeam">${teamHtml()}</div>
      <div class="papia-msgs" id="papiaMsgs"></div>
      <div class="papia-actions" id="papiaActions">${actionsHtml()}</div>
      <div class="papia-foot">
        <input id="papiaInput" placeholder="${isOwnerMode() ? 'Pergunte ou digite buscar…' : 'Pergunte sobre qualquer publicação…'}" aria-label="Mensagem"/>
        <button type="button" onclick="PAPublicIA.send()"><i class="fas fa-paper-plane"></i></button>
      </div>`;

    document.body.appendChild(backdrop);
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    document.body.classList.add('pa-has-papia');

    document.getElementById('papiaInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });
    window.addEventListener('resize', () => syncOpenState());

    setActiveAgent('sofia');
    addMsg('bot', welcomeMsg(), PASofia?.PROFILE);
  }

  function init() {
    const onHome = !!document.getElementById('heroDynamic');
    const onArticle = !!document.querySelector('main#main') && /noticia\.html/i.test(location.pathname);
    if (!onHome && !onArticle) return;
    createUI();
  }

  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  whenReady(init);

  return { init, toggle, send, quick, runSearch };
})();