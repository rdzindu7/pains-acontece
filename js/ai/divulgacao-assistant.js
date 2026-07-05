const PADivulgacaoIA = (function () {
  let open = false;
  let mounted = false;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function injectStyles() {
    if (document.getElementById('padiv-styles')) return;
    const s = document.createElement('style');
    s.id = 'padiv-styles';
    s.textContent = `
      .padiv-fab{position:fixed;bottom:calc(148px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#e67e22,#c0392b);border:2px solid rgba(201,162,39,.5);color:#fff;font-size:1.1rem;cursor:pointer;box-shadow:0 4px 24px rgba(230,126,34,.5);z-index:7999;display:flex;align-items:center;justify-content:center;transition:transform .3s}
      .padiv-fab:hover{transform:scale(1.08)}
      .padiv-panel{position:fixed;bottom:calc(210px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));width:min(400px,calc(100vw - 40px));height:min(500px,calc(100vh - 240px));background:rgba(8,8,8,.97);border:1px solid rgba(230,126,34,.35);border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.85);z-index:7999;display:flex;flex-direction:column;transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;transition:all .35s cubic-bezier(.16,1,.3,1);overflow:hidden}
      .padiv-panel.open,.padiv-panel.inline{transform:none;opacity:1;pointer-events:all;position:relative;bottom:auto;right:auto;width:100%;height:auto;min-height:420px;box-shadow:none;border:1px solid var(--border)}
      .padiv-head{padding:12px 14px;background:linear-gradient(90deg,rgba(230,126,34,.25),rgba(8,8,8,.5));border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px}
      .padiv-head .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#e67e22,#f39c12);display:flex;align-items:center;justify-content:center}
      .padiv-head h4{font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px;font-size:1rem;flex:1}
      .padiv-head button{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:1rem}
      .padiv-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:200px;max-height:320px}
      .padiv-msg{max-width:92%;padding:10px 14px;border-radius:10px;font-size:.78rem;line-height:1.55}
      .padiv-msg.bot{background:rgba(230,126,34,.12);border:1px solid rgba(230,126,34,.25);align-self:flex-start}
      .padiv-msg.user{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);align-self:flex-end}
      .padiv-actions{padding:8px 12px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.04)}
      .padiv-act{font-size:.58rem;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:6px 11px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);cursor:pointer}
      .padiv-act:hover{background:rgba(230,126,34,.2);color:#f39c12;border-color:rgba(230,126,34,.35)}
      .padiv-foot{padding:12px;display:flex;gap:8px;border-top:1px solid rgba(255,255,255,.06)}
      .padiv-foot input{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#fff;font-size:.78rem;outline:none}
      .padiv-foot button{width:44px;height:44px;border-radius:8px;background:#e67e22;border:none;color:#fff;cursor:pointer}
      @media(max-width:600px){.padiv-fab{bottom:calc(136px + env(safe-area-inset-bottom));right:14px}.padiv-panel:not(.inline){right:12px;width:calc(100vw - 24px)}}
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

  function toggle() {
    open = !open;
    document.getElementById('padivPanel')?.classList.toggle('open', open);
  }

  async function send() {
    const input = document.getElementById('padivInput');
    const msg = input?.value?.trim();
    if (!msg) return;
    addMsg('user', esc(msg));
    input.value = '';
    const result = PARafaela.process(msg);
    addMsg('bot', result.reply.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'));
  }

  function quick(scope, channel) {
    const result = PARafaela.generate(scope, channel || null);
    addMsg('user', `Divulgar ${result.scope}${channel ? ' — ' + channel : ''}`);
    addMsg('bot', result.reply.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'));
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
        ${inline ? '' : '<button onclick="PADivulgacaoIA.toggle()" title="Fechar"><i class="fas fa-times"></i></button>'}
      </div>
      <div class="padiv-msgs" id="padivMsgs"></div>
      <div class="padiv-actions">
        <button class="padiv-act" onclick="PADivulgacaoIA.quick('pains')"><i class="fas fa-map-marker-alt"></i> Pains</button>
        <button class="padiv-act" onclick="PADivulgacaoIA.quick('regiao')"><i class="fas fa-globe-americas"></i> Região</button>
        <button class="padiv-act" onclick="PADivulgacaoIA.quick('global')"><i class="fas fa-earth-americas"></i> Global</button>
        <button class="padiv-act" onclick="PADivulgacaoIA.quick('pains','whatsapp')">WhatsApp</button>
        <button class="padiv-act" onclick="PADivulgacaoIA.quick('regiao','instagram')">Instagram</button>
      </div>
      <div class="padiv-foot">
        <input id="padivInput" placeholder="Ex: divulgar o site em Pains no Instagram…" aria-label="Mensagem divulgação"/>
        <button onclick="PADivulgacaoIA.send()"><i class="fas fa-paper-plane"></i></button>
      </div>`;
    return panel;
  }

  function mountFab() {
    if (document.getElementById('padivFab')) return;
    const fab = document.createElement('button');
    fab.className = 'padiv-fab owner-only-fab';
    fab.id = 'padivFab';
    fab.title = 'IA Divulgação — Rafaela Costa';
    fab.innerHTML = '<i class="fas fa-bullhorn"></i>';
    fab.addEventListener('click', toggle);
    document.body.appendChild(fab);
    document.body.appendChild(buildPanel(false));
    const greet = PARafaela.greet();
    addMsg('bot', greet.reply.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'));
    document.getElementById('padivInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });
  }

  function mountInline(container) {
    if (!container || container.querySelector('#padivMsgs')) return;
    container.innerHTML = '';
    container.appendChild(buildPanel(true));
    mounted = true;
    const greet = PARafaela.greet();
    addMsg('bot', greet.reply.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'));
    document.getElementById('padivInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });
  }

  function init() {
    if (typeof PAAPI === 'undefined' || !PAAPI.isOwner()) return;
    if (document.getElementById('divulgacaoMount')) return;
    if (document.getElementById('heroDynamic')) mountFab();
  }

  return { init, toggle, send, quick, mountInline };
})();

document.addEventListener('DOMContentLoaded', () => PADivulgacaoIA.init());