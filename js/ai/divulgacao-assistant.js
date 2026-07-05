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
      .padiv-fab{
        position:fixed;bottom:calc(148px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));
        width:54px;height:54px;border-radius:50%;
        background:linear-gradient(135deg,#e67e22,#c0392b);border:2px solid rgba(201,162,39,.5);
        color:#fff;font-size:1.15rem;cursor:pointer;
        box-shadow:0 4px 24px rgba(230,126,34,.55);z-index:8600;
        display:flex;align-items:center;justify-content:center;transition:transform .3s,box-shadow .3s;
        -webkit-tap-highlight-color:transparent;touch-action:manipulation;
      }
      .padiv-fab:hover,.padiv-fab:focus-visible{transform:scale(1.08);box-shadow:0 8px 32px rgba(230,126,34,.75);outline:none}
      .padiv-panel{
        position:fixed;bottom:calc(216px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));
        width:min(400px,calc(100vw - 40px));height:min(500px,calc(100vh - 240px));
        background:rgba(8,8,8,.97);border:1px solid rgba(230,126,34,.35);border-radius:12px;
        box-shadow:0 24px 80px rgba(0,0,0,.85);z-index:8600;
        display:flex;flex-direction:column;
        transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;visibility:hidden;
        transition:transform .35s cubic-bezier(.16,1,.3,1),opacity .35s,visibility .35s;overflow:hidden;
        backdrop-filter:blur(14px);
      }
      .padiv-panel.open{
        transform:none;opacity:1;pointer-events:all;visibility:visible;
      }
      .padiv-panel.inline{
        position:relative;bottom:auto;right:auto;width:100%;height:auto;min-height:420px;
        transform:none;opacity:1;pointer-events:all;visibility:visible;
        box-shadow:none;border:1px solid var(--border, rgba(255,255,255,.1));
      }
      .padiv-head{padding:12px 14px;background:linear-gradient(90deg,rgba(230,126,34,.25),rgba(8,8,8,.5));border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px;flex-shrink:0}
      .padiv-head .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#e67e22,#f39c12);display:flex;align-items:center;justify-content:center}
      .padiv-head h4{font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px;font-size:1rem;flex:1}
      .padiv-head button{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:1rem;padding:4px}
      .padiv-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:180px;max-height:320px;-webkit-overflow-scrolling:touch}
      .padiv-msg{max-width:92%;padding:10px 14px;border-radius:10px;font-size:.78rem;line-height:1.55}
      .padiv-msg.bot{background:rgba(230,126,34,.12);border:1px solid rgba(230,126,34,.25);align-self:flex-start}
      .padiv-msg.user{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);align-self:flex-end}
      .padiv-actions{padding:8px 12px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.04);flex-shrink:0}
      .padiv-act{font-size:.58rem;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:6px 11px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);cursor:pointer}
      .padiv-act:hover{background:rgba(230,126,34,.2);color:#f39c12;border-color:rgba(230,126,34,.35)}
      .padiv-foot{padding:12px;display:flex;gap:8px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0}
      .padiv-foot input{flex:1;min-width:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#fff;font-size:.78rem;outline:none}
      .padiv-foot input:focus{border-color:#e67e22}
      .padiv-foot button{width:44px;height:44px;border-radius:8px;background:#e67e22;border:none;color:#fff;cursor:pointer;flex-shrink:0}
      @media(max-width:600px){
        .padiv-fab{bottom:calc(140px + env(safe-area-inset-bottom));right:calc(14px + env(safe-area-inset-right));width:50px;height:50px}
        .padiv-panel:not(.inline){right:12px;bottom:calc(200px + env(safe-area-inset-bottom));width:calc(100vw - 24px);height:min(460px,calc(100vh - 220px))}
      }
    `;
    document.head.appendChild(s);
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
    panel.classList.toggle('open', open);
    if (open) {
      setTimeout(() => document.getElementById('padivInput')?.focus(), 120);
    }
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
        <div><h4>IA Divulgação</h4><div style="font-size:.55rem;color:rgba(255,255,255,.45)">Rafaela Costa · Marketing</div></div>
        ${inline ? '' : '<button type="button" onclick="PADivulgacaoIA.toggle(false)" title="Fechar"><i class="fas fa-times"></i></button>'}
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
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'padiv-fab';
    fab.id = 'padivFab';
    fab.title = 'IA Divulgação — Rafaela Costa';
    fab.setAttribute('aria-label', 'Abrir IA de Divulgação');
    fab.innerHTML = '<i class="fas fa-bullhorn"></i>';
    fab.addEventListener('click', e => { e.preventDefault(); toggle(); });
    document.body.appendChild(fab);
    document.body.appendChild(buildPanel(false));
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
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  whenReady(init);

  return { init, toggle, send, quick, mountInline, mountFab };
})();