const PACornerNotify = (function () {
  const LS_AUTO = 'pa_autoscan_pref_v1';
  let queue = [];
  let current = null;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function injectStyles() {
    if (document.getElementById('pa-corner-notify-styles')) return;
    const s = document.createElement('style');
    s.id = 'pa-corner-notify-styles';
    s.textContent = `
      .pa-cn-wrap{
        position:fixed;left:calc(12px + env(safe-area-inset-left));bottom:calc(20px + env(safe-area-inset-bottom));
        z-index:8500;display:flex;flex-direction:column;gap:8px;
        max-width:min(340px,calc(100vw - 24px));pointer-events:none;
      }
      .pa-cn{
        pointer-events:all;background:rgba(10,10,10,.96);border:1px solid rgba(29,122,29,.35);
        border-radius:10px;padding:12px 14px;box-shadow:0 12px 40px rgba(0,0,0,.65);
        backdrop-filter:blur(14px);transform:translateX(-110%);opacity:0;
        transition:transform .4s cubic-bezier(.16,1,.3,1),opacity .35s;
      }
      .pa-cn.show{transform:none;opacity:1}
      .pa-cn.scanning{border-color:rgba(46,204,46,.45);box-shadow:0 12px 40px rgba(29,122,29,.25)}
      .pa-cn-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}
      .pa-cn-icon{
        width:32px;height:32px;border-radius:8px;flex-shrink:0;
        background:linear-gradient(135deg,rgba(29,122,29,.35),rgba(13,77,13,.5));
        display:flex;align-items:center;justify-content:center;color:#2ecc2e;font-size:.85rem;
      }
      .pa-cn.scanning .pa-cn-icon{animation:paCnPulse 1.2s ease infinite}
      @keyframes paCnPulse{0%,100%{opacity:1}50%{opacity:.45}}
      .pa-cn-title{font-size:.72rem;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#fff;line-height:1.3}
      .pa-cn-body{font-size:.76rem;color:rgba(255,255,255,.65);line-height:1.5;margin-bottom:10px}
      .pa-cn-body strong{color:rgba(255,255,255,.9)}
      .pa-cn-actions{display:flex;gap:6px;flex-wrap:wrap}
      .pa-cn-btn{
        font-size:.62rem;font-weight:800;letter-spacing:.7px;text-transform:uppercase;
        padding:7px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.05);color:rgba(255,255,255,.7);cursor:pointer;transition:all .2s;
      }
      .pa-cn-btn:hover{background:rgba(255,255,255,.1);color:#fff}
      .pa-cn-btn.yes{background:linear-gradient(135deg,#1d7a1d,#0d4d0d);border-color:rgba(46,204,46,.4);color:#fff}
      .pa-cn-btn.yes:hover{box-shadow:0 4px 16px rgba(29,122,29,.45)}
      .pa-cn-btn.no{color:rgba(255,255,255,.45)}
      .pa-cn-close{
        margin-left:auto;background:none;border:none;color:rgba(255,255,255,.3);
        cursor:pointer;font-size:.75rem;padding:2px 4px;line-height:1;
      }
      .pa-cn-close:hover{color:rgba(255,255,255,.7)}
      @media(max-width:600px){
        .pa-cn-wrap{left:calc(10px + env(safe-area-inset-left));bottom:calc(16px + env(safe-area-inset-bottom));max-width:calc(100vw - 20px)}
        .pa-cn{padding:11px 12px}
        .pa-cn-btn{flex:1;min-width:calc(50% - 4px);text-align:center;padding:9px 10px}
      }
      @media(max-width:400px){
        .pa-cn-actions{flex-direction:column}
        .pa-cn-btn{min-width:100%}
      }
    `;
    document.head.appendChild(s);
  }

  function ensureWrap() {
    injectStyles();
    let wrap = document.getElementById('paCornerNotifyWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'pa-cn-wrap';
      wrap.id = 'paCornerNotifyWrap';
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function dismiss() {
    if (!current?.el) return;
    current.el.classList.remove('show');
    setTimeout(() => {
      current?.el?.remove();
      current = null;
      showNext();
    }, 350);
  }

  function showNext() {
    if (current || !queue.length) return;
    const item = queue.shift();
    const wrap = ensureWrap();
    const el = document.createElement('div');
    el.className = 'pa-cn' + (item.scanning ? ' scanning' : '');
    el.innerHTML = `
      <div class="pa-cn-head">
        <div class="pa-cn-icon"><i class="fas ${item.icon || 'fa-satellite-dish'}"></i></div>
        <div style="flex:1;min-width:0">
          <div class="pa-cn-title">${esc(item.title)}</div>
        </div>
        ${item.closable !== false ? '<button type="button" class="pa-cn-close" aria-label="Fechar"><i class="fas fa-times"></i></button>' : ''}
      </div>
      ${item.body ? `<div class="pa-cn-body">${item.body}</div>` : ''}
      ${item.actions?.length ? `<div class="pa-cn-actions">${item.actions.map(a =>
        `<button type="button" class="pa-cn-btn ${a.kind || ''}" data-act="${esc(a.id)}">${esc(a.label)}</button>`
      ).join('')}</div>` : ''}`;

    el.querySelector('.pa-cn-close')?.addEventListener('click', () => {
      item.onClose?.();
      dismiss();
    });

    el.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        const action = item.actions.find(a => a.id === act);
        action?.onClick?.();
        if (action?.dismiss !== false) dismiss();
      });
    });

    wrap.appendChild(el);
    current = { el, item };
    requestAnimationFrame(() => el.classList.add('show'));
    if (item.duration) {
      setTimeout(() => {
        if (current?.el === el) {
          item.onTimeout?.();
          dismiss();
        }
      }, item.duration);
    }
  }

  function show(opts) {
    queue.push(opts);
    showNext();
    return {
      update(patch) {
        if (!current) return;
        Object.assign(current.item, patch);
        if (patch.title) current.el.querySelector('.pa-cn-title').textContent = patch.title;
        if (patch.body) {
          const b = current.el.querySelector('.pa-cn-body');
          if (b) b.innerHTML = patch.body;
        }
        if (patch.scanning != null) current.el.classList.toggle('scanning', !!patch.scanning);
      },
      dismiss
    };
  }

  function getAutoPref() {
    if (typeof PAAutomation !== 'undefined' && PAAutomation.autoScan()) return true;
    try { return localStorage.getItem(LS_AUTO) !== 'off'; } catch { return true; }
  }

  function setAutoPref(on) {
    try { localStorage.setItem(LS_AUTO, on ? 'on' : 'off'); } catch {}
  }

  return { show, dismiss, getAutoPref, setAutoPref };
})();