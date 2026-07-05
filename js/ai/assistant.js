const PAIA = (function () {
  let open = false;
  let mounted = false;
  let lastDraft = '';
  let lastArticle = null;
  let chatHistory = [];

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function fmtReply(text) {
    return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  function injectStyles() {
    if (document.getElementById('paia-styles')) return;
    const s = document.createElement('style');
    s.id = 'paia-styles';
    s.textContent = `
      .paia-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:7999;opacity:0;pointer-events:none;transition:opacity .3s;-webkit-tap-highlight-color:transparent}
      .paia-backdrop.open{opacity:1;pointer-events:all}
      .paia-fab{
        position:fixed;bottom:calc(20px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));
        width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1d7a1d,#0d4d0d);border:none;color:#fff;
        font-size:1.3rem;cursor:pointer;box-shadow:0 4px 24px rgba(29,122,29,.5);z-index:8000;
        transition:transform .3s,box-shadow .3s,opacity .3s;display:flex;align-items:center;justify-content:center;
        -webkit-tap-highlight-color:transparent;touch-action:manipulation;
      }
      .paia-fab:hover{transform:scale(1.08);box-shadow:0 8px 32px rgba(29,122,29,.7)}
      .paia-fab.hidden{opacity:0;pointer-events:none;transform:scale(.85)}
      .paia-fab .badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;background:#c9a227;border-radius:50%;font-size:.55rem;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #080808}
      .paia-panel{
        position:fixed;bottom:calc(88px + env(safe-area-inset-bottom));right:calc(20px + env(safe-area-inset-right));
        width:min(400px,calc(100vw - 40px));height:min(520px,calc(100vh - 120px));
        max-height:calc(100dvh - 100px);background:#111;border:1px solid rgba(255,255,255,.08);border-radius:12px;
        box-shadow:0 24px 80px rgba(0,0,0,.8);z-index:8001;display:flex;flex-direction:column;
        transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;visibility:hidden;
        transition:transform .35s cubic-bezier(.16,1,.3,1),opacity .35s,visibility .35s;overflow:hidden;
      }
      .paia-panel.open{transform:none;opacity:1;pointer-events:all;visibility:visible}
      .paia-head{padding:12px 14px;background:rgba(29,122,29,.12);border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px;flex-shrink:0;min-height:0}
      .paia-head .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1d7a1d,#2ecc2e);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
      .paia-head .meta{flex:1;min-width:0}
      .paia-head h4{font-family:'Bebas Neue',sans-serif;letter-spacing:1.5px;font-size:1rem;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .paia-head .status{font-size:.58rem;color:#2ecc2e;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .paia-head button{background:none;border:none;color:rgba(255,255,255,.4);cursor:pointer;font-size:1.1rem;padding:8px;flex-shrink:0;-webkit-tap-highlight-color:transparent}
      .paia-head button:hover{color:#fff}
      .paia-msgs{flex:1;min-height:0;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
      .paia-msg{max-width:92%;padding:10px 14px;border-radius:10px;font-size:.8rem;line-height:1.55;word-break:break-word}
      .paia-msg.bot{background:rgba(29,122,29,.12);border:1px solid rgba(29,122,29,.2);align-self:flex-start;border-bottom-left-radius:2px}
      .paia-msg.user{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);align-self:flex-end;border-bottom-right-radius:2px}
      .paia-msg.typing{color:rgba(255,255,255,.4);font-style:italic}
      .paia-msg .verif{display:inline-block;margin-top:6px;padding:3px 8px;border-radius:20px;font-size:.58rem;font-weight:800;letter-spacing:.5px}
      .paia-msg .verif.ok{background:rgba(46,204,46,.15);color:#2ecc2e}
      .paia-msg .verif.warn{background:rgba(201,162,39,.15);color:#c9a227}
      .paia-actions{padding:8px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px;flex-shrink:0;border-top:1px solid rgba(255,255,255,.04)}
      .paia-act{font-size:.58rem;font-weight:700;letter-spacing:.4px;text-transform:uppercase;padding:8px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.6);cursor:pointer;transition:all .2s;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-tap-highlight-color:transparent}
      .paia-act:hover,.paia-act:active{background:rgba(29,122,29,.15);color:#2ecc2e;border-color:rgba(29,122,29,.3)}
      .paia-foot{padding:10px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;flex-shrink:0;align-items:flex-end}
      .paia-foot textarea{flex:1;min-width:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;color:#fff;font-family:'Inter',sans-serif;font-size:.8rem;resize:none;height:44px;max-height:80px;outline:none;line-height:1.4}
      .paia-foot textarea:focus{border-color:#1d7a1d}
      .paia-foot button{width:44px;height:44px;border-radius:8px;background:#1d7a1d;border:none;color:#fff;cursor:pointer;flex-shrink:0;transition:background .2s;-webkit-tap-highlight-color:transparent}
      .paia-foot button:hover{background:#2ecc2e}
      .paia-foot button:disabled{opacity:.5;cursor:not-allowed}
      @media(min-width:601px){
        .paia-actions{display:flex;flex-wrap:wrap;gap:6px}
        .paia-act{width:auto;padding:5px 10px;border-radius:20px}
      }
      @media(max-width:600px){
        .paia-panel.open{
          inset:0;width:100%;max-width:100%;height:100%;max-height:100%;height:100dvh;
          bottom:0;right:0;border-radius:0;border:none;
        }
        .paia-fab{right:calc(16px + env(safe-area-inset-right));bottom:calc(16px + env(safe-area-inset-bottom));width:52px;height:52px}
        .paia-head{padding:14px 16px;padding-top:calc(14px + env(safe-area-inset-top))}
        .paia-actions{padding:10px 12px;gap:8px}
        .paia-act{padding:10px 8px;font-size:.6rem}
        body.pa-has-padiv .paia-fab{bottom:calc(84px + env(safe-area-inset-bottom))}
      }
    `;
    document.head.appendChild(s);
  }

  function syncOpenState() {
    const panel = document.getElementById('paiaPanel');
    const fab = document.getElementById('paiaFab');
    const backdrop = document.getElementById('paiaBackdrop');
    const mobile = window.innerWidth <= 600;
    panel?.classList.toggle('open', open);
    backdrop?.classList.toggle('open', open && mobile);
    fab?.classList.toggle('hidden', open && mobile);
    document.body.style.overflow = open && mobile ? 'hidden' : '';
    if (open) setTimeout(() => document.getElementById('paiaInput')?.focus(), 100);
  }

  function createUI() {
    if (document.getElementById('paiaPanel')) return;
    injectStyles();

    const backdrop = document.createElement('div');
    backdrop.className = 'paia-backdrop';
    backdrop.id = 'paiaBackdrop';
    backdrop.addEventListener('click', () => { if (open) toggle(); });

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'paia-fab';
    fab.id = 'paiaFab';
    fab.title = 'Assistente IA Editorial';
    fab.setAttribute('aria-label', 'Abrir Equipe IA Editorial');
    fab.innerHTML = '<i class="fas fa-robot"></i><span class="badge">IA</span>';

    const panel = document.createElement('div');
    panel.className = 'paia-panel';
    panel.id = 'paiaPanel';
    panel.innerHTML = `
      <div class="paia-head">
        <div class="av"><i class="fas fa-robot"></i></div>
        <div class="meta">
          <h4>Equipe IA Editorial</h4>
          <div class="status">● Sofia · Lucas · Camila</div>
        </div>
        <button type="button" onclick="PAIA.toggle()" title="Fechar" aria-label="Fechar"><i class="fas fa-times"></i></button>
      </div>
      <div class="paia-msgs" id="paiaMsgs"></div>
      <div class="paia-actions">
        <button type="button" class="paia-act" onclick="PAIA.quick('verificar')">Verificar Fatos</button>
        <button type="button" class="paia-act" onclick="PAIA.quick('organizar')">Organizar</button>
        <button type="button" class="paia-act" onclick="PAIA.showPreview()">Preview</button>
        <button type="button" class="paia-act" onclick="PAIA.applyToEditor()">Aplicar no Editor</button>
      </div>
      <div class="paia-foot">
        <textarea id="paiaInput" placeholder="Cole a notícia ou descreva a pauta…" rows="2" aria-label="Mensagem para a IA"></textarea>
        <button type="button" id="paiaSend" onclick="PAIA.send()" aria-label="Enviar"><i class="fas fa-paper-plane"></i></button>
      </div>`;

    document.body.appendChild(backdrop);
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    document.body.classList.add('pa-has-paia');

    fab.addEventListener('click', () => toggle());
    document.getElementById('paiaInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    window.addEventListener('resize', () => syncOpenState());

    addMsg('bot', '**Sofia Mendes** recebe sua demanda → **Lucas Ferreira** busca e verifica fontes → **Camila Rocha** organiza e prepara para publicar. Cole a notícia ou descreva a pauta.');
    mounted = true;
  }

  function addMsg(role, text, extra) {
    const msgs = document.getElementById('paiaMsgs');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'paia-msg ' + role;
    div.innerHTML = fmtReply(text) + (extra || '');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    chatHistory.push({ role, text });
  }

  function toggle(force) {
    open = typeof force === 'boolean' ? force : !open;
    syncOpenState();
  }

  async function send() {
    const input = document.getElementById('paiaInput');
    const btn = document.getElementById('paiaSend');
    const msg = input?.value?.trim();
    if (!msg) return;

    addMsg('user', msg);
    input.value = '';
    lastDraft = msg;
    if (btn) btn.disabled = true;

    const typing = document.createElement('div');
    typing.className = 'paia-msg bot typing';
    typing.id = 'paiaTyping';
    typing.textContent = 'Sofia encaminhando → Lucas buscando fontes…';
    document.getElementById('paiaMsgs')?.appendChild(typing);

    if (typeof PAOrchestrator !== 'undefined') {
      PAOrchestrator.setAgentCallback(({ agent, status }) => {
        if (status) typing.textContent = `${agent?.name || 'IA'}: ${status}`;
      });
    }

    try {
      const res = await PAAPI.aiChat(msg, { lastDraft: msg, hints: getEditorHints() });
      typing.remove();
      let extra = '';
      if (res.verification) {
        const cls = res.verification.verified ? 'ok' : 'warn';
        const lbl = res.verification.verified ? '✓ VERIFICADO' : '⚠ REVISAR';
        extra = `<div class="verif ${cls}">${lbl} — ${res.verification.confidence}%</div>`;
      }
      if (res.article) lastArticle = res.article;
      const prefix = res.agent ? `**${res.agent.name}:** ` : '';
      addMsg('bot', prefix + res.reply, extra);
      if (res.article && res.action === 'organize') applyToEditor(true);
    } catch (err) {
      typing.remove();
      addMsg('bot', 'Não foi possível processar. Verifique sua conexão e tente novamente.', '<div class="verif warn">ERRO</div>');
    }
    if (btn) btn.disabled = false;
  }

  function getEditorHints() {
    return {
      title: document.getElementById('artTitle')?.value,
      lead: document.getElementById('artLead')?.value,
      cat: document.getElementById('artCat')?.value
    };
  }

  function applyToEditor(silent) {
    if (!lastArticle) {
      if (!silent) showToast?.('Nenhuma matéria organizada ainda. Envie uma mensagem primeiro.', 'info');
      return;
    }
    const t = document.getElementById('artTitle');
    const l = document.getElementById('artLead');
    const c = document.getElementById('artContent');
    const cat = document.getElementById('artCat');
    if (t) t.value = lastArticle.title || '';
    if (l) l.value = lastArticle.lead || '';
    if (c) c.innerHTML = lastArticle.content || '';
    if (cat && lastArticle.cat) cat.value = lastArticle.cat;
    if (!silent) showToast?.('Matéria aplicada no editor!', 'success');
  }

  function showPreview() {
    const title = document.getElementById('artTitle')?.value || lastArticle?.title || 'Sem título';
    const lead = document.getElementById('artLead')?.value || lastArticle?.lead || '';
    const content = document.getElementById('artContent')?.innerHTML || lastArticle?.content || '';
    const cat = document.getElementById('artCat')?.value || lastArticle?.cat || 'Notícias';
    const img = lastArticle?.img || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
    const verified = lastArticle?.verified;
    const conf = lastArticle?.confidence || 0;

    const modal = document.getElementById('previewModal');
    const body = document.getElementById('previewModalBody');
    if (!modal || !body) return;

    body.innerHTML = `
      <div style="background:#080808;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.06)">
        <div style="position:relative;height:200px;overflow:hidden">
          <img src="${esc(img)}" style="width:100%;height:100%;object-fit:cover" alt=""/>
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(8,8,8,.9),transparent)"></div>
          <span style="position:absolute;bottom:12px;left:16px;background:rgba(29,122,29,.8);padding:4px 10px;border-radius:2px;font-size:.6rem;font-weight:800;letter-spacing:1px;text-transform:uppercase">${esc(cat)}</span>
        </div>
        <div style="padding:24px">
          ${verified !== undefined ? `<div style="margin-bottom:12px;padding:6px 12px;border-radius:20px;display:inline-block;font-size:.65rem;font-weight:800;background:${verified ? 'rgba(46,204,46,.12)' : 'rgba(201,162,39,.12)'};color:${verified ? '#2ecc2e' : '#c9a227'}">${verified ? '✓ VERIFICADO' : '⚠ REVISAR'} — ${conf}% confiança</div>` : ''}
          <h2 style="font-family:'Playfair Display',serif;font-size:1.6rem;line-height:1.25;margin-bottom:12px">${esc(title)}</h2>
          <p style="color:rgba(255,255,255,.5);font-size:.95rem;margin-bottom:20px;line-height:1.6">${esc(lead)}</p>
          <div style="font-size:.75rem;color:#555;margin-bottom:20px;display:flex;gap:16px;flex-wrap:wrap">
            <span><i class="fas fa-user-circle"></i> Redação Pains Acontece</span>
            <span><i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          <div style="font-size:.88rem;line-height:1.8;color:rgba(255,255,255,.8)">${content}</div>
        </div>
      </div>`;
    modal.classList.add('open');
  }

  function quick(action) {
    const input = document.getElementById('paiaInput');
    const draft = lastDraft || document.getElementById('artContent')?.textContent || document.getElementById('artTitle')?.value;
    if (action === 'verificar') input.value = draft ? 'verificar: ' + draft.slice(0, 200) : 'verificar fatos da notícia atual';
    else if (action === 'organizar') input.value = draft || '';
    else if (action === 'preview') { showPreview(); return; }
    else if (action === 'apply') { applyToEditor(); return; }
    if (input?.value?.trim()) send();
  }

  function canMount() {
    if (!document.getElementById('panel-nova')) return false;
    return typeof PAAPI === 'undefined' || PAAPI.isOwner();
  }

  function init() {
    if (!canMount()) return;
    createUI();
  }

  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  whenReady(init);

  return { init, toggle, send, quick, showPreview, applyToEditor, getLastArticle: () => lastArticle };
})();