/**
 * PADialog — confirmações, alertas e toasts integrados ao visual do portal
 */
const PADialog = (function () {
  let open = false;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function injectStyles() {
    if (document.getElementById('pa-dialog-styles')) return;
    const s = document.createElement('style');
    s.id = 'pa-dialog-styles';
    s.textContent = `
      .pa-dlg-backdrop{
        position:fixed;inset:0;z-index:12000;
        background:rgba(0,0,0,.72);backdrop-filter:blur(8px);
        display:flex;align-items:center;justify-content:center;
        padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
        opacity:0;visibility:hidden;transition:opacity .28s,visibility .28s;
      }
      .pa-dlg-backdrop.open{opacity:1;visibility:visible}
      .pa-dlg{
        width:min(400px,100%);background:linear-gradient(165deg,#1a1a1a 0%,#0d0d0d 100%);
        border:1px solid rgba(255,255,255,.1);border-radius:14px;
        box-shadow:0 24px 80px rgba(0,0,0,.85),0 0 0 1px rgba(29,122,29,.12);
        transform:scale(.92) translateY(12px);opacity:0;
        transition:transform .32s cubic-bezier(.16,1,.3,1),opacity .28s;
        overflow:hidden;
      }
      .pa-dlg-backdrop.open .pa-dlg{transform:none;opacity:1}
      .pa-dlg-head{padding:22px 22px 0;display:flex;gap:14px;align-items:flex-start}
      .pa-dlg-icon{
        width:44px;height:44px;border-radius:12px;flex-shrink:0;
        display:flex;align-items:center;justify-content:center;font-size:1.1rem;
      }
      .pa-dlg-icon.info{background:rgba(29,122,29,.18);color:#2ecc2e}
      .pa-dlg-icon.warning{background:rgba(201,162,39,.18);color:#c9a227}
      .pa-dlg-icon.danger{background:rgba(181,42,42,.18);color:#e74c3c}
      .pa-dlg-icon.success{background:rgba(29,155,240,.15);color:#1d9bf0}
      .pa-dlg-titles{flex:1;min-width:0}
      .pa-dlg-title{font-family:'Bebas Neue','Inter',sans-serif;letter-spacing:1px;font-size:1.15rem;color:#fff;line-height:1.25;margin-bottom:4px}
      .pa-dlg-msg{font-size:.82rem;color:rgba(255,255,255,.55);line-height:1.55;white-space:pre-line}
      .pa-dlg-body{padding:14px 22px 20px}
      .pa-dlg-foot{padding:0 18px 18px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
      .pa-dlg-btn{
        padding:10px 20px;border-radius:8px;border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.05);color:rgba(255,255,255,.75);
        font-size:.78rem;font-weight:700;cursor:pointer;transition:all .2s;
        font-family:inherit;letter-spacing:.3px;
      }
      .pa-dlg-btn:hover{background:rgba(255,255,255,.1);color:#fff}
      .pa-dlg-btn.primary{background:linear-gradient(135deg,#1d7a1d,#0d4d0d);border-color:rgba(46,204,46,.35);color:#fff}
      .pa-dlg-btn.primary:hover{box-shadow:0 4px 20px rgba(29,122,29,.45);transform:translateY(-1px)}
      .pa-dlg-btn.danger{background:linear-gradient(135deg,#b52a2a,#8b1a1a);border-color:rgba(231,76,60,.35);color:#fff}
      .pa-dlg-btn.danger:hover{box-shadow:0 4px 20px rgba(181,42,42,.45);transform:translateY(-1px)}
      .pa-dlg-btn.ghost{border-color:transparent;background:transparent;color:rgba(255,255,255,.45)}
      .pa-toast-wrap{
        position:fixed;top:calc(16px + env(safe-area-inset-top));right:calc(16px + env(safe-area-inset-right));
        z-index:13000;display:flex;flex-direction:column;gap:8px;pointer-events:none;
        max-width:min(360px,calc(100vw - 32px));
      }
      .pa-toast{
        pointer-events:all;padding:12px 16px;border-radius:10px;
        background:rgba(14,14,14,.96);border:1px solid rgba(255,255,255,.1);
        box-shadow:0 12px 40px rgba(0,0,0,.6);backdrop-filter:blur(12px);
        font-size:.8rem;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:10px;
        transform:translateX(110%);opacity:0;transition:transform .35s cubic-bezier(.16,1,.3,1),opacity .3s;
      }
      .pa-toast.show{transform:none;opacity:1}
      .pa-toast i{font-size:.9rem;flex-shrink:0}
      .pa-toast.success{border-color:rgba(46,204,46,.35)}.pa-toast.success i{color:#2ecc2e}
      .pa-toast.error{border-color:rgba(231,76,60,.35)}.pa-toast.error i{color:#e74c3c}
      .pa-toast.info{border-color:rgba(201,162,39,.35)}.pa-toast.info i{color:#c9a227}
    `;
    document.head.appendChild(s);
  }

  function ensureBackdrop() {
    injectStyles();
    let el = document.getElementById('paDialogBackdrop');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pa-dlg-backdrop';
      el.id = 'paDialogBackdrop';
      el.addEventListener('click', e => {
        if (e.target === el && el.dataset.cancelable === '1') el._resolve?.(false);
      });
      document.body.appendChild(el);
    }
    return el;
  }

  function ensureToastWrap() {
    injectStyles();
    let w = document.getElementById('paToastWrap');
    if (!w) {
      w = document.createElement('div');
      w.className = 'pa-toast-wrap';
      w.id = 'paToastWrap';
      document.body.appendChild(w);
    }
    return w;
  }

  const ICONS = {
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
    danger: 'fa-trash-alt',
    success: 'fa-check-circle'
  };

  function showModal(opts, buttons) {
    return new Promise(resolve => {
      if (open) resolve(false);
      open = true;
      const backdrop = ensureBackdrop();
      const variant = opts.variant || 'info';
      const title = opts.title || 'Pains Acontece';
      const message = opts.message || '';
      backdrop.dataset.cancelable = opts.cancelable !== false ? '1' : '0';
      backdrop._resolve = v => { close(v); };
      backdrop.innerHTML = `
        <div class="pa-dlg" role="dialog" aria-modal="true" aria-labelledby="paDlgTitle">
          <div class="pa-dlg-head">
            <div class="pa-dlg-icon ${variant}"><i class="fas ${opts.icon || ICONS[variant] || ICONS.info}"></i></div>
            <div class="pa-dlg-titles">
              <div class="pa-dlg-title" id="paDlgTitle">${esc(title)}</div>
            </div>
          </div>
          <div class="pa-dlg-body"><p class="pa-dlg-msg">${esc(message)}</p></div>
          <div class="pa-dlg-foot">${buttons}</div>
        </div>`;

      requestAnimationFrame(() => backdrop.classList.add('open'));

      function close(val) {
        backdrop.classList.remove('open');
        open = false;
        setTimeout(() => { backdrop.innerHTML = ''; resolve(val); }, 280);
      }

      backdrop.querySelectorAll('[data-dlg-action]').forEach(btn => {
        btn.addEventListener('click', () => close(btn.dataset.dlgAction === 'ok'));
      });

      const onKey = e => {
        if (e.key === 'Escape' && opts.cancelable !== false) { close(false); document.removeEventListener('keydown', onKey); }
        if (e.key === 'Enter') { close(true); document.removeEventListener('keydown', onKey); }
      };
      document.addEventListener('keydown', onKey);
    });
  }

  function confirm(opts) {
    if (typeof opts === 'string') opts = { message: opts };
    const ok = opts.confirmText || 'Confirmar';
    const cancel = opts.cancelText || 'Cancelar';
    const cls = opts.variant === 'danger' ? 'danger' : 'primary';
    return showModal(
      { ...opts, title: opts.title || 'Confirmar ação', variant: opts.variant || 'warning' },
      `<button type="button" class="pa-dlg-btn ghost" data-dlg-action="cancel">${esc(cancel)}</button>
       <button type="button" class="pa-dlg-btn ${cls}" data-dlg-action="ok">${esc(ok)}</button>`
    );
  }

  function alert(opts) {
    if (typeof opts === 'string') opts = { message: opts };
    const ok = opts.confirmText || 'Entendi';
    return showModal(
      { ...opts, title: opts.title || 'Aviso', cancelable: false, variant: opts.variant || 'info' },
      `<button type="button" class="pa-dlg-btn primary" data-dlg-action="ok">${esc(ok)}</button>`
    ).then(() => {});
  }

  function toast(message, type = 'info', ms = 3200) {
    const wrap = ensureToastWrap();
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const el = document.createElement('div');
    el.className = `pa-toast ${type}`;
    el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${esc(message)}</span>`;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 350);
    }, ms);
  }

  function init() {
    injectStyles();
  }

  init();

  return { confirm, alert, toast, init };
})();