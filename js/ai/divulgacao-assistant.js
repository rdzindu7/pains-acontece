const PADivulgacaoIA = (function () {
  let open = false;
  let mounted = false;
  let lastResult = null;
  let currentScope = 'pains';

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
      .padiv-fab{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#e67e22,#c0392b);border:2px solid rgba(201,162,39,.5);color:#fff;font-size:1.15rem;cursor:pointer;box-shadow:0 4px 24px rgba(230,126,34,.55);z-index:8600;display:flex;align-items:center;justify-content:center;transition:transform .3s}
      .padiv-fab:hover{transform:scale(1.08)}
      .padiv-fab.hidden{opacity:0;pointer-events:none}
      .padiv-panel{position:fixed;bottom:calc(152px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));width:min(440px,calc(100vw - 40px));height:min(560px,calc(100vh - 160px));background:rgba(8,8,8,.97);border:1px solid rgba(230,126,34,.35);border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.85);z-index:8601;display:flex;flex-direction:column;transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;visibility:hidden;transition:all .35s cubic-bezier(.16,1,.3,1);overflow:hidden;backdrop-filter:blur(14px)}
      .padiv-panel.open{transform:none;opacity:1;pointer-events:all;visibility:visible}
      .padiv-panel.inline{position:relative;bottom:auto;right:auto;width:100%;height:auto;min-height:480px;max-height:none;transform:none;opacity:1;pointer-events:all;visibility:visible;box-shadow:none;border:1px solid rgba(230,126,34,.2);border-radius:12px}
      .padiv-head{padding:14px 18px;background:rgba(230,126,34,.08);border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:12px;flex-shrink:0}
      .padiv-head .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#e67e22,#f39c12);display:flex;align-items:center;justify-content:center}
      .padiv-head h4{font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px;font-size:1rem}
      .padiv-toolbar{padding:10px 12px;display:flex;flex-wrap:wrap;gap:8px;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;align-items:center}
      .padiv-toolbar label{font-size:.62rem;color:rgba(255,255,255,.45);margin-right:4px}
      .padiv-toolbar select{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.72rem;padding:6px 10px}
      .padiv-msgs{flex:1;min-height:0;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
      .padiv-panel.inline .padiv-msgs{min-height:220px;max-height:400px}
      .padiv-msg{max-width:94%;padding:10px 14px;border-radius:10px;font-size:.78rem;line-height:1.55;word-break:break-word}
      .padiv-msg.bot{background:rgba(230,126,34,.12);border:1px solid rgba(230,126,34,.25);align-self:flex-start}
      .padiv-msg.user{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);align-self:flex-end}
      .padiv-copy-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      .padiv-copy{font-size:.6rem;padding:5px 10px;border-radius:16px;border:1px solid rgba(46,204,46,.35);background:rgba(46,204,46,.1);color:#2ecc2e;cursor:pointer}
      .padiv-copy:hover{background:rgba(46,204,46,.22)}
      .padiv-actions{padding:8px 12px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;border-top:1px solid rgba(255,255,255,.04);flex-shrink:0}
      .padiv-act{font-size:.6rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:9px 8px;border-radius:20px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:rgba(255,255,255,.65);cursor:pointer;text-align:center;transition:all .22s}
      .padiv-act:hover,.padiv-act.primary{background:rgba(230,126,34,.2);color:#f39c12;border-color:rgba(230,126,34,.4)}
      .padiv-foot{padding:10px 12px;display:flex;gap:8px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0}
      .padiv-foot input{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#fff;font-size:.78rem;outline:none}
      .padiv-foot button{width:44px;height:44px;border-radius:8px;background:#e67e22;border:none;color:#fff;cursor:pointer}
      @media(max-width:600px){.padiv-panel:not(.inline).open{inset:0;width:100%;height:100dvh;border-radius:0}}
    `;
    document.head.appendChild(s);
  }

  function getScope() {
    const sel = document.getElementById('padivScope');
    return sel?.value || currentScope;
  }

  function getChannel() {
    const sel = document.getElementById('padivChannel');
    const v = sel?.value;
    return v && v !== 'all' ? v : null;
  }

  function copyText(text) {
    const t = (text || '').replace(/<[^>]+>/g, '');
    navigator.clipboard.writeText(t).then(() => {
      if (typeof PADialog !== 'undefined') PADialog.toast('Texto copiado!', 'success');
      else if (typeof showToast === 'function') showToast('Texto copiado!', 'success');
    }).catch(() => {});
  }

  function copyButtons(result) {
    if (!result?.posts) return '';
    const keys = ['whatsapp', 'instagram', 'facebook', 'twitter'];
    return `<div class="padiv-copy-row">${keys.map(k =>
      `<button type="button" class="padiv-copy" data-ch="${k}"><i class="fas fa-copy"></i> ${k}</button>`
    ).join('')}</div>`;
  }

  function bindCopyButtons(root, result) {
    const posts = result?.posts || lastResult?.posts;
    if (!posts) return;
    (root || document).querySelectorAll('.padiv-copy[data-ch]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      const ch = btn.getAttribute('data-ch');
      btn.addEventListener('click', () => copyText(posts[ch]));
    });
  }

  function addMsg(role, html, result) {
    const msgs = document.getElementById('padivMsgs');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'padiv-msg ' + role;
    div.innerHTML = html + (result ? copyButtons(result) : '');
    msgs.appendChild(div);
    bindCopyButtons(div, result);
    msgs.scrollTop = msgs.scrollHeight;
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
  }

  function toggle(force) {
    const panel = document.getElementById('padivPanel');
    if (!panel || panel.classList.contains('inline')) return;
    open = typeof force === 'boolean' ? force : !open;
    syncOpenState();
    if (open) setTimeout(() => document.getElementById('padivInput')?.focus(), 120);
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
    let result = PARafaela.process(msg);
    if (result?.then) result = await result;
    lastResult = result;
    addMsg('bot', fmtReply(result.reply), result);
  }

  async function quick(scope, channel, mode) {
    if (typeof PARafaela === 'undefined') return;
    currentScope = scope || getScope();
    let result;
    if (mode === 'auto') {
      addMsg('user', `Divulgação automática — ${currentScope}`);
      result = await PARafaela.autoDivulgar(currentScope, { channel: channel || getChannel() });
      if (result.campaigns?.length) {
        result.campaigns.forEach(c => {
          addMsg('bot', fmtReply(`**${c.article.title}**\n\n` + (c.posts.posts.whatsapp || '')), c.posts);
        });
        return;
      }
    } else if (mode === 'targets') {
      result = PARafaela.process('canais ' + currentScope);
    } else if (mode === 'article') {
      const arts = await PARafaela.getLatestArticles(1);
      const art = arts[0];
      if (!art) {
        addMsg('bot', 'Nenhuma matéria publicada para divulgar.');
        return;
      }
      addMsg('user', `Divulgar matéria: ${art.title}`);
      result = PARafaela.generate(currentScope, channel || getChannel(), art);
    } else {
      addMsg('user', `Campanha ${currentScope}${channel ? ' — ' + channel : ''}`);
      result = PARafaela.generate(currentScope, channel || null, null);
    }
    lastResult = result;
    addMsg('bot', fmtReply(result.reply), result);
  }

  function buildPanel(inline) {
    injectStyles();
    const panel = document.createElement('div');
    panel.className = 'padiv-panel' + (inline ? ' inline open' : '');
    panel.id = 'padivPanel';
    panel.innerHTML = `
      <div class="padiv-head">
        <div class="av"><i class="fas fa-bullhorn"></i></div>
        <div class="meta" style="flex:1">
          <h4>IA Divulgação</h4>
          <div style="font-size:.55rem;color:rgba(255,255,255,.45)">Rafaela Costa · Busca canais e cria campanhas</div>
        </div>
        ${inline ? '' : '<button type="button" onclick="PADivulgacaoIA.toggle(false)" style="background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer"><i class="fas fa-times"></i></button>'}
      </div>
      <div class="padiv-toolbar">
        <label>Alcance</label>
        <select id="padivScope">
          <option value="pains">Pains MG</option>
          <option value="regiao">Região</option>
          <option value="mg">Minas Gerais</option>
          <option value="brasil">Brasil</option>
          <option value="global">Global</option>
        </select>
        <label>Canal</label>
        <select id="padivChannel">
          <option value="all">Todos</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="twitter">X / Twitter</option>
        </select>
      </div>
      <div class="padiv-msgs" id="padivMsgs"></div>
      <div class="padiv-actions">
        <button type="button" class="padiv-act primary" onclick="PADivulgacaoIA.quick('pains',null,'auto')"><i class="fas fa-rocket"></i> Auto</button>
        <button type="button" class="padiv-act" onclick="PADivulgacaoIA.quick(null,null,'article')"><i class="fas fa-newspaper"></i> Matéria</button>
        <button type="button" class="padiv-act" onclick="PADivulgacaoIA.quick(null,null,'targets')"><i class="fas fa-sitemap"></i> Canais</button>
        <button type="button" class="padiv-act" onclick="PADivulgacaoIA.quick('pains')">Pains</button>
        <button type="button" class="padiv-act" onclick="PADivulgacaoIA.quick('regiao')">Região</button>
        <button type="button" class="padiv-act" onclick="PADivulgacaoIA.quick('brasil')">Brasil</button>
      </div>
      <div class="padiv-foot">
        <input id="padivInput" placeholder="Ex: divulgar auto região no Instagram…"/>
        <button type="button" onclick="PADivulgacaoIA.send()"><i class="fas fa-paper-plane"></i></button>
      </div>`;
    return panel;
  }

  function mountInline(container) {
    if (!container) return;
    container.innerHTML = '';
    open = true;
    container.appendChild(buildPanel(true));
    const g = typeof PARafaela !== 'undefined' ? PARafaela.greet() : { reply: 'IA Divulgação carregando…' };
    addMsg('bot', fmtReply(g.reply));
    mounted = true;
  }

  function mountFab() {
    if (document.getElementById('padivFab')) return;
    injectStyles();
    const backdrop = document.createElement('div');
    backdrop.className = 'padiv-backdrop';
    backdrop.id = 'padivBackdrop';
    backdrop.addEventListener('click', () => toggle(false));
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'padiv-fab';
    fab.id = 'padivFab';
    fab.title = 'IA Divulgação';
    fab.innerHTML = '<i class="fas fa-bullhorn"></i>';
    fab.addEventListener('click', () => toggle());
    document.body.appendChild(backdrop);
    document.body.appendChild(fab);
    document.body.appendChild(buildPanel(false));
    addMsg('bot', fmtReply((typeof PARafaela !== 'undefined' ? PARafaela.greet() : { reply: '' }).reply));
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { init, toggle, send, quick, mountInline, mountFab, copyText };
})();