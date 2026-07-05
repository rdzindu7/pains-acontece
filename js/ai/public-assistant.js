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

  function injectStyles() {
    if (document.getElementById('papia-styles')) return;
    const s = document.createElement('style');
    s.id = 'papia-styles';
    s.textContent = `
      .papia-fab{position:fixed;bottom:calc(80px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#1d7a1d,#0d4d0d);border:2px solid rgba(201,162,39,.4);color:#fff;font-size:1.2rem;cursor:pointer;box-shadow:0 4px 24px rgba(29,122,29,.55);z-index:8000;transition:transform .3s,box-shadow .3s;display:flex;align-items:center;justify-content:center}
      .papia-fab:hover{transform:scale(1.08) rotate(-3deg);box-shadow:0 8px 32px rgba(29,122,29,.75)}
      .papia-fab .dot{position:absolute;top:6px;right:6px;width:10px;height:10px;background:#2ecc2e;border-radius:50%;border:2px solid #080808;animation:pulse 1.5s ease infinite}
      .papia-panel{position:fixed;bottom:calc(148px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));width:min(400px,calc(100vw - 40px));height:min(520px,calc(100vh - 180px));background:rgba(8,8,8,.97);border:1px solid rgba(29,122,29,.35);border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.85);z-index:8000;display:flex;flex-direction:column;transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;transition:all .35s cubic-bezier(.16,1,.3,1);overflow:hidden;backdrop-filter:blur(16px)}
      .papia-panel.open{transform:none;opacity:1;pointer-events:all}
      .papia-head{padding:14px 16px;background:linear-gradient(90deg,rgba(13,77,13,.9),rgba(8,8,8,.5));border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px}
      .papia-head .av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#1d7a1d,#2ecc2e);display:flex;align-items:center;justify-content:center}
      .papia-head h4{font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px;font-size:1.05rem;flex:1}
      .papia-head .sub{font-size:.58rem;color:rgba(255,255,255,.45);letter-spacing:1px;text-transform:uppercase}
      .papia-head button{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:1rem}
      .papia-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
      .papia-msg{max-width:90%;padding:10px 14px;border-radius:10px;font-size:.78rem;line-height:1.55}
      .papia-msg.bot{background:rgba(29,122,29,.12);border:1px solid rgba(29,122,29,.25);align-self:flex-start}
      .papia-msg.user{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);align-self:flex-end}
      .papia-msg.typing{color:rgba(255,255,255,.4);font-style:italic}
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

  function addMsg(role, html) {
    const msgs = document.getElementById('papiaMsgs');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'papia-msg ' + role;
    div.innerHTML = html;
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
    addMsg('bot', '<i class="fas fa-satellite-dish"></i> <strong>Busca minuciosa</strong> em andamento — cada matéria será verificada em múltiplas fontes antes de publicar…');
    const onProgress = (e) => {
      const d = e.detail;
      if (!d || !scanning) return;
      const el = document.querySelector('#papiaMsgs .papia-msg.bot:last-child');
      if (el && el.querySelector('.fa-satellite-dish')) {
        el.innerHTML = `<i class="fas fa-satellite-dish"></i> Verificando <strong>${d.current}/${d.total}</strong>: ${(d.title || '').slice(0, 55)}…`;
      }
    };
    window.addEventListener('pa-deep-verify', onProgress);
    try {
      PAScanner.invalidateCache?.();
      const result = await PAAutoPublisher.run(true);
      await PAStore.init();
      if (typeof window.PAHomeRefresh === 'function') window.PAHomeRefresh();
      const pub = result.published || 0;
      const scanned = result.scanned || 0;
      addMsg('bot', pub
        ? `✓ <strong>${pub}</strong> matéria(s) passaram na <strong>verificação minuciosa</strong> e foram publicadas (${scanned} analisadas). Cada uma foi cruzada com múltiplas fontes.`
        : `Busca minuciosa concluída (${scanned} itens analisados). Nenhuma nova matéria aprovada — as publicações já estão verificadas.`);
    } catch {
      addMsg('bot', 'Não foi possível concluir a varredura. Verifique sua conexão e tente novamente.');
    }
    window.removeEventListener('pa-deep-verify', onProgress);
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

    if (/^(buscar|varrer|scanner|atualizar)(\s|$)/i.test(msg)) {
      await runSearch();
      return;
    }

    const typing = document.createElement('div');
    typing.className = 'papia-msg bot typing';
    typing.textContent = 'Consultando fontes e verificando fatos…';
    document.getElementById('papiaMsgs')?.appendChild(typing);

    try {
      if (typeof PAStore !== 'undefined' && !PAStore.getArticles('pub').length) {
        await PAStore.init().catch(() => {});
      }
      const res = await PAAPI.aiChat(msg, {});
      typing.remove();
      let extra = '';
      if (res.verification && res.action !== 'greeting' && res.action !== 'help') {
        const ok = res.verification.verified;
        extra = `<br><span style="font-size:.65rem;color:${ok ? '#2ecc2e' : '#c9a227'}">${ok ? '✓' : '◆'} ${res.verification.confidence}% · ${res.verification.sources?.length || 0} fonte(s)</span>`;
      }
      if (res.action === 'scan') {
        extra += '<br><button class="papia-act" style="margin-top:8px" onclick="PAPublicIA.runSearch()">▶ Executar Busca Agora</button>';
      }
      addMsg('bot', fmt(res.reply) + extra);
    } catch {
      typing?.remove();
      addMsg('bot', 'Erro ao processar. Tente "buscar" para atualizar notícias ou descreva sua dúvida sobre Pains.');
    }
  }

  function quick(cmd) {
    const input = document.getElementById('papiaInput');
    if (cmd === 'buscar') { runSearch(); return; }
    if (cmd === 'pains') { sendDirect('O que aconteceu recentemente em Pains MG?'); return; }
    if (cmd === 'mundo') { sendDirect('Quais as notícias do Brasil e mundo agora?'); return; }
    if (cmd === 'clima') { sendDirect('como está o clima em Pains?'); return; }
    if (input?.value.trim()) send();
  }

  function createUI() {
    injectStyles();
    const fab = document.createElement('button');
    fab.className = 'papia-fab';
    fab.title = 'IA Pains Acontece — Busca Inteligente';
    fab.innerHTML = '<i class="fas fa-brain"></i><span class="dot"></span>';
    fab.addEventListener('click', toggle);

    const panel = document.createElement('div');
    panel.className = 'papia-panel';
    panel.id = 'papiaPanel';
    panel.innerHTML = `
      <div class="papia-head">
        <div class="av"><i class="fas fa-brain"></i></div>
        <div><h4>IA Pains Acontece</h4><div class="sub">Verificação · Pains · Brasil · Mundo</div></div>
        <button onclick="PAPublicIA.toggle()" title="Fechar"><i class="fas fa-times"></i></button>
      </div>
      <div class="papia-msgs" id="papiaMsgs"></div>
      <div class="papia-actions">
        <button class="papia-act" onclick="PAPublicIA.quick('buscar')"><i class="fas fa-rss"></i> Buscar Agora</button>
        <button class="papia-act" onclick="PAPublicIA.quick('pains')">Pains MG</button>
        <button class="papia-act" onclick="PAPublicIA.quick('mundo')">Brasil/Mundo</button>
        <button class="papia-act" onclick="PAPublicIA.quick('clima')">Clima</button>
      </div>
      <div class="papia-foot">
        <input id="papiaInput" placeholder="Pergunte ou digite buscar…" aria-label="Mensagem IA"/>
        <button onclick="PAPublicIA.send()"><i class="fas fa-paper-plane"></i></button>
      </div>`;

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    document.getElementById('papiaInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });

    addMsg('bot', 'Sou a <strong>IA editorial</strong> do Pains Acontece. Publico apenas notícias de <strong>hoje</strong>, com verificação minuciosa e imagens reais.<br><br>• <strong>Buscar Agora</strong> — busca detalhada + publicação<br>• <strong>Notícia Rápida</strong> — resumo explicativo em cada matéria<br>• <strong>Bom dia</strong> às 6h com destaques');
  }

  function init() {
    if (!document.getElementById('heroDynamic')) return;
    createUI();
  }

  return { init, toggle, send, quick, runSearch };
})();

document.addEventListener('DOMContentLoaded', () => PAPublicIA.init());