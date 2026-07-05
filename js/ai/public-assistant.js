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
      .papia-fab{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#1d7a1d,#0d4d0d);border:2px solid rgba(201,162,39,.4);color:#fff;font-size:1.2rem;cursor:pointer;box-shadow:0 4px 24px rgba(29,122,29,.55);z-index:8000;transition:transform .3s,box-shadow .3s;display:flex;align-items:center;justify-content:center}
      .papia-fab:hover{transform:scale(1.08) rotate(-3deg);box-shadow:0 8px 32px rgba(29,122,29,.75)}
      .papia-fab .dot{position:absolute;top:6px;right:6px;width:10px;height:10px;background:#2ecc2e;border-radius:50%;border:2px solid #080808;animation:pulse 1.5s ease infinite}
      .papia-panel{position:fixed;bottom:calc(148px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));width:min(420px,calc(100vw - 40px));height:min(560px,calc(100vh - 180px));background:rgba(8,8,8,.97);border:1px solid rgba(29,122,29,.35);border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.85);z-index:8000;display:flex;flex-direction:column;transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;transition:all .35s cubic-bezier(.16,1,.3,1);overflow:hidden;backdrop-filter:blur(16px)}
      .papia-panel.open{transform:none;opacity:1;pointer-events:all}
      .papia-head{padding:12px 14px;background:linear-gradient(90deg,rgba(13,77,13,.9),rgba(8,8,8,.5));border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px}
      .papia-head .av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#1d7a1d,#2ecc2e);display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .papia-head h4{font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px;font-size:1.05rem;flex:1;line-height:1.2}
      .papia-head .sub{font-size:.55rem;color:rgba(255,255,255,.45);letter-spacing:.8px;text-transform:uppercase}
      .papia-head button{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:1rem}
      .papia-team{display:flex;gap:6px;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,.04);background:rgba(0,0,0,.2)}
      .papia-team-member{flex:1;text-align:center;padding:6px 4px;border-radius:6px;border:1px solid rgba(255,255,255,.06);font-size:.52rem;color:rgba(255,255,255,.4);transition:all .3s}
      .papia-team-member i{display:block;font-size:.75rem;margin-bottom:3px}
      .papia-team-member strong{display:block;font-size:.58rem;letter-spacing:.5px;color:rgba(255,255,255,.7)}
      .papia-team-member.active{border-color:var(--ag-c,var(--g));background:rgba(29,122,29,.12);color:#fff;box-shadow:0 0 12px rgba(29,122,29,.2)}
      .papia-team-member.active strong{color:var(--ag-c,#2ecc2e)}
      .papia-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
      .papia-msg{max-width:92%;padding:10px 14px;border-radius:10px;font-size:.78rem;line-height:1.55}
      .papia-msg.bot{background:rgba(29,122,29,.12);border:1px solid rgba(29,122,29,.25);align-self:flex-start}
      .papia-msg.user{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);align-self:flex-end}
      .papia-msg.typing{color:rgba(255,255,255,.4);font-style:italic}
      .papia-agent-tag{font-size:.58rem;color:var(--ag-color,#2ecc2e);margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:6px}
      .papia-agent-tag i{opacity:.85}
      .papia-actions{padding:8px 12px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.04)}
      .papia-act{font-size:.58rem;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:6px 11px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);cursor:pointer;transition:all .2s}
      .papia-act:hover{background:rgba(29,122,29,.2);color:#2ecc2e;border-color:rgba(29,122,29,.35)}
      .papia-foot{padding:12px;display:flex;gap:8px;border-top:1px solid rgba(255,255,255,.06)}
      .papia-foot input{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#fff;font-size:.78rem;outline:none}
      .papia-foot input:focus{border-color:#1d7a1d}
      .papia-foot button{width:44px;height:44px;border-radius:8px;background:#1d7a1d;border:none;color:#fff;cursor:pointer}
      @media(max-width:600px){.papia-panel{right:12px;width:calc(100vw - 24px)}.papia-fab{right:14px;bottom:calc(72px + env(safe-area-inset-bottom))}}
    `;
    document.head.appendChild(s);
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

  function toggle() {
    open = !open;
    document.getElementById('papiaPanel')?.classList.toggle('open', open);
    if (open) document.getElementById('papiaInput')?.focus();
  }

  async function runSearch() {
    if (scanning) return;
    scanning = true;
    setActiveAgent('lucas');
    addMsg('bot', '<i class="fas fa-satellite-dish"></i> Varredura completa iniciada…', PALucas?.PROFILE);

    const onProgress = (e) => {
      const d = e.detail;
      if (!d || !scanning) return;
      setActiveAgent('lucas');
    };
    window.addEventListener('pa-deep-verify', onProgress);

    PAOrchestrator?.setAgentCallback?.(({ agent, status }) => {
      setActiveAgent(agent?.id);
      const el = document.querySelector('#papiaMsgs .papia-msg.bot:last-child');
      if (el && scanning && status) {
        const badge = agentBadge(agent);
        el.innerHTML = badge + `<i class="fas ${agent?.icon || 'fa-spinner fa-spin'}"></i> ${esc(status)}`;
      }
    });

    try {
      const res = typeof PAOrchestrator !== 'undefined'
        ? await PAOrchestrator.runScan(true)
        : null;
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

    const classification = typeof PASofia !== 'undefined' ? PASofia.classify(msg) : { intent: 'question' };
    const isScan = classification.intent === 'scan' || /^(buscar|varrer|scanner|atualizar)(\s|$)/i.test(msg);

    if (isScan) {
      await runSearch();
      return;
    }

    setActiveAgent('sofia');
    const typing = document.createElement('div');
    typing.className = 'papia-msg bot typing';
    typing.innerHTML = agentBadge(PASofia?.PROFILE) + 'Encaminhando para a equipe…';
    document.getElementById('papiaMsgs')?.appendChild(typing);

    PAOrchestrator?.setAgentCallback?.(({ agent, status }) => {
      setActiveAgent(agent?.id);
      if (status) typing.innerHTML = agentBadge(agent) + esc(status);
    });

    try {
      if (typeof PAStore !== 'undefined' && !PAStore.getArticles('pub').length) {
        await PAStore.init().catch(() => {});
      }

      const res = typeof PAOrchestrator !== 'undefined'
        ? await PAOrchestrator.process(msg, {})
        : await PAAPI.aiChat(msg, {});

      typing.remove();
      setActiveAgent(res.agent?.id || 'camila');

      let extra = '';
      if (res.verification && res.action !== 'greeting' && res.action !== 'help') {
        const ok = res.verification.verified;
        extra = `<br><span style="font-size:.65rem;color:${ok ? '#2ecc2e' : '#c9a227'}">${ok ? '✓' : '◆'} ${res.verification.confidence}% · ${res.verification.sources?.length || 0} fonte(s)</span>`;
      }

      addMsg('bot', fmt(res.reply) + extra, res.agent);

      if (res._followUpScan && !scanning) {
        addMsg('bot', 'Iniciando varredura automática…', PALucas?.PROFILE);
        await runSearch();
      }
    } catch {
      typing?.remove();
      addMsg('bot', 'Erro ao processar. Tente novamente ou digite <strong>buscar</strong>.', PASofia?.PROFILE);
    }

    setActiveAgent('sofia');
  }

  function quick(cmd) {
    if (cmd === 'buscar') { runSearch(); return; }
    if (cmd === 'pains') { sendDirect('O que aconteceu recentemente em Pains MG?'); return; }
    if (cmd === 'mundo') { sendDirect('Quais as notícias do Brasil e mundo agora?'); return; }
    if (cmd === 'clima') { sendDirect('como está o clima em Pains?'); return; }
    const input = document.getElementById('papiaInput');
    if (input?.value.trim()) send();
  }

  function teamHtml() {
    const team = typeof PAOrchestrator !== 'undefined' ? PAOrchestrator.getTeam() : [];
    return team.map(a => `
      <div class="papia-team-member" data-agent="${a.id}" style="--ag-c:${a.color}">
        <i class="fas ${a.icon}"></i>
        <strong>${esc(a.name.split(' ')[0])}</strong>
        ${esc(a.role.split(' ')[0])}
      </div>`).join('');
  }

  function createUI() {
    injectStyles();
    const fab = document.createElement('button');
    fab.className = 'papia-fab';
    fab.title = 'Equipe IA Pains Acontece';
    fab.innerHTML = '<i class="fas fa-users"></i><span class="dot"></span>';
    fab.addEventListener('click', toggle);

    const panel = document.createElement('div');
    panel.className = 'papia-panel';
    panel.id = 'papiaPanel';
    panel.innerHTML = `
      <div class="papia-head">
        <div class="av"><i class="fas fa-users"></i></div>
        <div><h4>Equipe IA Editorial</h4><div class="sub">Sofia · Lucas · Camila</div></div>
        <button onclick="PAPublicIA.toggle()" title="Fechar"><i class="fas fa-times"></i></button>
      </div>
      <div class="papia-team" id="papiaTeam">${teamHtml()}</div>
      <div class="papia-msgs" id="papiaMsgs"></div>
      <div class="papia-actions">
        <button class="papia-act" onclick="PAPublicIA.quick('buscar')"><i class="fas fa-rss"></i> Buscar Agora</button>
        <button class="papia-act" onclick="PAPublicIA.quick('pains')">Pains MG</button>
        <button class="papia-act" onclick="PAPublicIA.quick('mundo')">Brasil/Mundo</button>
        <button class="papia-act" onclick="PAPublicIA.quick('clima')">Clima</button>
      </div>
      <div class="papia-foot">
        <input id="papiaInput" placeholder="Pergunte — Sofia encaminha para Lucas e Camila…" aria-label="Mensagem IA"/>
        <button onclick="PAPublicIA.send()"><i class="fas fa-paper-plane"></i></button>
      </div>`;

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    document.getElementById('papiaInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });

    setActiveAgent('sofia');
    addMsg('bot', 'Somos a <strong>equipe IA editorial</strong> do Pains Acontece — três especialistas trabalhando juntas:<br><br>• <strong>Sofia Mendes</strong> recebe você<br>• <strong>Lucas Ferreira</strong> busca e verifica fontes<br>• <strong>Camila Rocha</strong> edita e publica<br><br>Pergunte qualquer coisa sobre notícias — a busca é <strong>automática</strong>.', PASofia?.PROFILE);
  }

  function init() {
    if (!document.getElementById('heroDynamic')) return;
    if (typeof PAAPI !== 'undefined' && !PAAPI.isOwner()) return;
    createUI();
  }

  return { init, toggle, send, quick, runSearch };
})();

document.addEventListener('DOMContentLoaded', () => PAPublicIA.init());