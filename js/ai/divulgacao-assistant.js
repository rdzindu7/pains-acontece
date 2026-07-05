const PADivulgacaoIA = (function () {
  let open = false;
  let mounted = false;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function fmtReply(text) {
    return (text || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function injectStyles() {
    if (document.getElementById('padiv-styles')) return;
    const s = document.createElement('style');
    s.id = 'padiv-styles';
    s.textContent = `
      .padiv-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:8599;opacity:0;pointer-events:none;transition:opacity .3s}
      .padiv-backdrop.open{opacity:1;pointer-events:all}
      .padiv-fab{
        position:fixed;bottom:calc(84px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));
        width:54px;height:54px;border-radius:50%;
        background:linear-gradient(135deg,#e67e22,#c0392b);border:2px solid rgba(201,162,39,.5);
        color:#fff;font-size:1.15rem;cursor:pointer;
        box-shadow:0 4px 24px rgba(230,126,34,.55);z-index:8600;
        display:flex;align-items:center;justify-content:center;transition:transform .3s,box-shadow .3s,opacity .3s;
        -webkit-tap-highlight-color:transparent;touch-action:manipulation;
      }
      .padiv-fab:hover,.padiv-fab:focus-visible{transform:scale(1.08);box-shadow:0 8px 32px rgba(230,126,34,.75);outline:none}
      .padiv-fab.hidden{opacity:0;pointer-events:none;transform:scale(.85)}
      .padiv-panel{
        position:fixed;bottom:calc(152px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));
        width:min(400px,calc(100vw - 40px));height:min(500px,calc(100vh - 180px));max-height:calc(100dvh - 120px);
        background:rgba(8,8,8,.97);border:1px solid rgba(230,126,34,.35);border-radius:12px;
        box-shadow:0 24px 80px rgba(0,0,0,.85);z-index:8601;
        display:flex;flex-direction:column;
        transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;visibility:hidden;
        transition:transform .35s cubic-bezier(.16,1,.3,1),opacity .35s,visibility .35s;overflow:hidden;
        backdrop-filter:blur(14px);
      }
      .padiv-panel.open{transform:none;opacity:1;pointer-events:all;visibility:visible}
      .padiv-panel.inline{
        position:relative;bottom:auto;right:auto;width:100%;height:auto;min-height:440px;max-height:none;
        transform:none;opacity:1;pointer-events:all;visibility:visible;
        box-shadow:none;border:none;border-radius:0;
        display:flex;flex-direction:column;background:transparent;
      }
      .padiv-head{padding:16px 20px;background:rgba(230,126,34,.08);border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:12px;flex-shrink:0}
      .padiv-head .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#e67e22,#f39c12);display:flex;align-items:center;justify-content:center;flex-shrink:0}
      .padiv-head .meta{flex:1;min-width:0}
      .padiv-head h4{font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .padiv-head button{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:1rem;padding:8px;flex-shrink:0}
      .padiv-msgs{flex:1;min-height:0;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}
      .padiv-panel.inline .padiv-msgs{min-height:200px;max-height:360px}
      .padiv-msg{max-width:92%;padding:10px 14px;border-radius:10px;font-size:.78rem;line-height:1.55;word-break:break-word}
      .padiv-msg.bot{background:rgba(230,126,34,.12);border:1px solid rgba(230,126,34,.25);align-self:flex-start}
      .padiv-msg.user{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);align-self:flex-end}
      .padiv-actions{padding:8px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px;border-top:1px solid rgba(255,255,255,.04);flex-shrink:0}
      .padiv-act{font-size:.62rem;font-weight:700;letter-spacing:.6px;text-transform:uppercase;padding:9px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:rgba(255,255,255,.6);cursor:pointer;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-tap-highlight-color:transparent;transition:all .22s}
      .padiv-act:hover,.padiv-act:active{background:rgba(230,126,34,.18);color:#f39c12;border-color:rgba(230,126,34,.35);transform:translateY(-1px)}
      .padiv-foot{padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;gap:8px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;align-items:center}
      .padiv-foot input{flex:1;min-width:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#fff;font-size:.78rem;outline:none}
      .padiv-foot input:focus{border-color:#e67e22}
      .padiv-foot button{width:44px;height:44px;border-radius:8px;background:#e67e22;border:none;color:#fff;cursor:pointer;flex-shrink:0}
      @media(min-width:601px){
        .padiv-actions{display:flex;flex-wrap:wrap;gap:6px}
        .padiv-act{width:auto;padding:6px 11px;border-radius:20px}
      }
      @media(max-width:600px){
        .padiv-panel:not(.inline).open{inset:0;width:100%;max-width:100%;height:100%;max-height:100%;height:100dvh;bottom:0;right:0;border-radius:0;border:none}
        .padiv-fab{right:calc(14px + env(safe-area-inset-right));bottom:calc(80px + env(safe-area-inset-bottom));width:50px;height:50px}
        .padiv-head{padding-top:calc(12px + env(safe-area-inset-top))}
        .padiv-actions{padding:10px 12px;gap:8px}
        .padiv-act{padding:10px 6px}
        body:not(.pa-has-papia) .padiv-fab{bottom:calc(16px + env(safe-area-inset-bottom))}
      }
    `;
    document.head.appendChild(s);
  }

  function syncOpenState() {
    const panel = document.getElementById('padivPanel');
    if (!panel || panel.classList.contains('inline')) return;
    const fab = document.getElementById('padivFab');
    const backdrop = document.getElementById('padivBackdrop');
    const mobile = window.innerWidth <= 600;
    panel.classList.toggle('open', open);
    backdrop?.classList.toggle('open', open && mobile);
    fab?.classList.toggle('hidden', open && mobile);
    document.body.style.overflow = open && mobile ? 'hidden' : '';
    if (open) setTimeout(() => document.getElementById('padivInput')?.focus(), 120);
  }

  function addMsg(role, html) {
    const msgs = document.getElementById('padivMsgs');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'padiv-msg ' + role;
    div.innerHTML = html;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function toggle(force) {
    const panel = document.getElementById('padivPanel');
    if (!panel || panel.classList.contains('inline')) return;
    open = typeof force === 'boolean' ? force : !open;
    syncOpenState();
  }

  async function send() {
    if (typeof PARafaela === 'undefined') {
      addMsg('bot', 'IA de divulgação indisponível. Recarregue a página.');
      return;
    }
    const input = document.getElementById('padivInput');
    const msg = input?.value?.trim();
    if (!msg) return;
    addMsg('user', esc(msg));
    input.value = '';
    const result = PARafaela.process(msg);
    addMsg('bot', fmtReply(result.reply));
  }

  function quick(scope, channel) {
    if (typeof PARafaela === 'undefined') return;
    const result = PARafaela.generate(scope, channel || null);
    addMsg('user', `Divulgar ${result.scope}${channel ? ' — ' + channel : ''}`);
    addMsg('bot', fmtReply(result.reply));
  }

  function bindInput() {
    const input = document.getElementById('padivInput');
    if (!input || input.dataset.bound) return;
    input.dataset.bound = '1';
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });
  }

  function buildPanel(inline) {
    injectStyles();
    const panel = document.createElement('div');
    panel.className = 'padiv-panel' + (inline ? ' inline open' : '');
    panel.id = 'padivPanel';
    panel.innerHTML = `
      <div class="padiv-head">
        <div class="av"><i class="fas fa-bullhorn"></i></div>
        <div class="meta">
          <h4>IA Divulgação</h4>
          <div style="font-size:.55rem;color:rgba(255,255,255,.45)">Rafaela Costa · Marketing</div>
        </div>
        ${inline ? '' : '<button type="button" onclick="PADivulgacaoIA.toggle(false)" title="Fechar" aria-label="Fechar"><i class="fas fa-times"></i></button>'}
      </div>
      <div class="padiv-msgs" id="padivMsgs"></div>
      <div class="padiv-actions">
        <button type="button" class="padiv-act" onclick="PADivulgacaoIA.quick('pains')"><i class="fas fa-map-marker-alt"></i> Pains</button>
        <button type="button" class="padiv-act" onclick="PADivulgacaoIA.quick('regiao')"><i class="fas fa-globe-americas"></i> Região</button>
        <button type="button" class="padiv-act" onclick="PADivulgacaoIA.quick('global')"><i class="fas fa-earth-americas"></i> Global</button>
        <button type="button" class="padiv-act" onclick="PADivulgacaoIA.quick('pains','whatsapp')">WhatsApp</button>
        <button type="button" class="padiv-act" onclick="PADivulgacaoIA.quick('regiao','instagram')">Instagram</button>
      </div>
      <div class="padiv-foot">
        <input id="padivInput" placeholder="Ex: divulgar o site em Pains no Instagram…" aria-label="Mensagem divulgação"/>
        <button type="button" onclick="PADivulgacaoIA.send()"><i class="fas fa-paper-plane"></i></button>
      </div>`;
    return panel;
  }

  function greet() {
    if (typeof PARafaela === 'undefined') {
      return { reply: 'Olá! Sou a <strong>Rafaela Costa</strong>, especialista em divulgação do portal.' };
    }
    return PARafaela.greet();
  }

  function mountFab() {
    if (document.getElementById('padivFab')) return;
    injectStyles();

    const backdrop = document.createElement('div');
    backdrop.className = 'padiv-backdrop';
    backdrop.id = 'padivBackdrop';
    backdrop.addEventListener('click', () => { if (open) toggle(false); });

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'padiv-fab';
    fab.id = 'padivFab';
    fab.title = 'IA Divulgação — Rafaela Costa';
    fab.setAttribute('aria-label', 'Abrir IA de Divulgação');
    fab.innerHTML = '<i class="fas fa-bullhorn"></i>';
    fab.addEventListener('click', e => { e.preventDefault(); toggle(); });

    document.body.appendChild(backdrop);
    document.body.appendChild(fab);
    document.body.appendChild(buildPanel(false));
    document.body.classList.add('pa-has-padiv');
    window.addEventListener('resize', () => syncOpenState());

    addMsg('bot', fmtReply(greet().reply));
    bindInput();
    mounted = true;
  }

  function mountInline(container) {
    if (!container) return;
    container.innerHTML = '';
    open = true;
    container.appendChild(buildPanel(true));
    addMsg('bot', fmtReply(greet().reply));
    bindInput();
    mounted = true;
  }

  function canMount() {
    return typeof PAAPI !== 'undefined' && PAAPI.isOwner();
  }

  function init() {
    if (!canMount()) return;
    if (document.getElementById('divulgacaoMount')) return;
    if (document.getElementById('heroDynamic')) mountFab();
  }

  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  whenReady(init);

  return { init, toggle, send, quick, mountInline, mountFab };
})();