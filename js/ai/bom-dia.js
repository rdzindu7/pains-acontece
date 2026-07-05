const PABomDia = (function () {
  const LS_KEY = 'pa_bomdia_last';
  const TZ = 'America/Sao_Paulo';

  function brNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  }

  function todayKey() {
    const d = brNow();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function shouldShow() {
    const d = brNow();
    const h = d.getHours();
    if (h < 6 || h >= 11) return false;
    return localStorage.getItem(LS_KEY) !== todayKey();
  }

  function markShown() {
    localStorage.setItem(LS_KEY, todayKey());
  }

  function esc(s) {
    const el = document.createElement('div');
    el.textContent = s || '';
    return el.innerHTML;
  }

  function injectStyles() {
    if (document.getElementById('pa-bomdia-css')) return;
    const s = document.createElement('style');
    s.id = 'pa-bomdia-css';
    s.textContent = `
      .pa-bomdia-overlay{position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(8px);z-index:10050;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;transition:opacity .5s cubic-bezier(.16,1,.3,1)}
      .pa-bomdia-overlay.open{opacity:1;pointer-events:all}
      .pa-bomdia-card{max-width:480px;width:100%;background:linear-gradient(145deg,#0a1a0a,#080808);border:1px solid rgba(29,122,29,.45);border-radius:8px;overflow:hidden;box-shadow:0 32px 100px rgba(0,0,0,.8);transform:scale(.92) translateY(20px);transition:transform .5s cubic-bezier(.16,1,.3,1);animation:paBomDiaGlow 4s ease-in-out infinite alternate}
      .pa-bomdia-overlay.open .pa-bomdia-card{transform:none}
      @keyframes paBomDiaGlow{from{box-shadow:0 32px 80px rgba(29,122,29,.15)}to{box-shadow:0 32px 100px rgba(201,162,39,.2)}}
      .pa-bomdia-head{padding:28px 28px 20px;text-align:center;background:linear-gradient(180deg,rgba(29,122,29,.2),transparent);border-bottom:1px solid rgba(255,255,255,.05)}
      .pa-bomdia-sun{font-size:2.4rem;margin-bottom:8px;animation:paSunFloat 3s ease-in-out infinite}
      @keyframes paSunFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(8deg)}}
      .pa-bomdia-head h2{font-family:'Bebas Neue',sans-serif;font-size:2rem;letter-spacing:2px;color:#fff;margin-bottom:4px}
      .pa-bomdia-head p{font-size:.85rem;color:rgba(255,255,255,.5)}
      .pa-bomdia-body{padding:20px 28px 24px}
      .pa-bomdia-stats{display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap}
      .pa-bomdia-stat{flex:1;min-width:100px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:4px;padding:12px;text-align:center}
      .pa-bomdia-stat strong{display:block;font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:#c9a227}
      .pa-bomdia-stat span{font-size:.65rem;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:1px}
      .pa-bomdia-list{list-style:none;display:flex;flex-direction:column;gap:8px;margin-bottom:20px}
      .pa-bomdia-list li a{display:flex;gap:10px;padding:10px 12px;background:rgba(255,255,255,.03);border-radius:4px;border:1px solid rgba(255,255,255,.05);font-size:.78rem;color:rgba(255,255,255,.8);transition:background .2s,border-color .2s}
      .pa-bomdia-list li a:hover{background:rgba(29,122,29,.12);border-color:rgba(29,122,29,.35);color:#fff}
      .pa-bomdia-list li a::before{content:'◆';color:#2ecc2e;font-size:.5rem;margin-top:4px;flex-shrink:0}
      .pa-bomdia-actions{display:flex;gap:10px}
      .pa-bomdia-btn{flex:1;padding:12px;border-radius:4px;font-size:.75rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border:none;transition:transform .2s,box-shadow .2s}
      .pa-bomdia-btn.primary{background:linear-gradient(135deg,#1d7a1d,#0d4d0d);color:#fff;box-shadow:0 4px 20px rgba(29,122,29,.4)}
      .pa-bomdia-btn.primary:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(29,122,29,.55)}
      .pa-bomdia-btn.ghost{background:transparent;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.1)}
      @media(max-width:480px){.pa-bomdia-head h2{font-size:1.6rem}}
    `;
    document.head.appendChild(s);
  }

  async function getHeadlines() {
    let arts = [];
    try {
      if (typeof PAStore !== 'undefined') {
        await PAStore.init?.();
        arts = PAStore.getArticles('pub') || [];
      }
    } catch {}
    if (typeof PAScanner !== 'undefined' && PAScanner.isFreshNews) {
      arts = arts.filter(a => {
        if (a.pubISO) return PAScanner.isFreshNews(new Date(a.pubISO));
        return (a.timeAgo || '').includes('min') || (a.timeAgo || '').includes('hora');
      });
    }
    return arts.slice(0, 4);
  }

  async function show(force) {
    if (!force && !shouldShow()) return;
    injectStyles();
    const headlines = await getHeadlines();
    const count = headlines.length;
    const hour = brNow().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    const overlay = document.createElement('div');
    overlay.className = 'pa-bomdia-overlay';
    overlay.id = 'paBomDiaOverlay';
    overlay.innerHTML = `
      <div class="pa-bomdia-card">
        <div class="pa-bomdia-head">
          <div class="pa-bomdia-sun">☀️</div>
          <h2>${greeting}, Pains!</h2>
          <p>${brNow().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div class="pa-bomdia-body">
          <div class="pa-bomdia-stats">
            <div class="pa-bomdia-stat"><strong>${count}</strong><span>Notícias hoje</span></div>
            <div class="pa-bomdia-stat"><strong>6h</strong><span>Atualização</span></div>
            <div class="pa-bomdia-stat"><strong>IA</strong><span>Verificada</span></div>
          </div>
          ${count ? `<ul class="pa-bomdia-list">${headlines.map(a =>
            `<li><a href="pages/noticia.html?id=${a.id}&mode=quick">${esc(a.title)}</a></li>`
          ).join('')}</ul>` : '<p style="font-size:.82rem;color:rgba(255,255,255,.45);margin-bottom:16px">A IA está buscando as notícias de hoje…</p>'}
          <div class="pa-bomdia-actions">
            <button class="pa-bomdia-btn primary" data-action="news">Ver notícias do dia</button>
            <button class="pa-bomdia-btn ghost" data-action="close">Fechar</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });
    overlay.querySelector('[data-action="close"]')?.addEventListener('click', close);
    overlay.querySelector('[data-action="news"]')?.addEventListener('click', () => {
      close();
      location.hash = 'ultimas';
      if (typeof applyNav === 'function') applyNav('ultimas');
      else location.href = 'index.html#ultimas';
    });

    function close() {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 500);
      markShown();
    }
    markShown();
  }

  function scheduleCheck() {
    setInterval(() => {
      const d = brNow();
      if (d.getHours() === 6 && d.getMinutes() < 2 && shouldShow()) show(true);
    }, 60000);
  }

  function init() {
    if (!document.getElementById('heroDynamic')) return;
    setTimeout(() => show(false), 1200);
    scheduleCheck();
  }

  return { init, show, shouldShow };
})();

document.addEventListener('DOMContentLoaded', () => PABomDia.init());