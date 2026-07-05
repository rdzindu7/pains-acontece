/**
 * Widget IA de busca de notícias — Pains e região
 */
const PANewsWidget = (function () {
  let mounted = false;

  function injectStyles() {
    if (document.getElementById('panews-styles')) return;
    const s = document.createElement('style');
    s.id = 'panews-styles';
    s.textContent = `
      .panews-section{background:linear-gradient(165deg,rgba(13,77,13,.14),rgba(8,8,8,.55));border:1px solid rgba(29,122,29,.3);border-radius:14px;padding:clamp(20px,4vw,32px)}
      .panews-head{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:20px;align-items:flex-start}
      .panews-avatar{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#0d4d0d,#2ecc2e);display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#fff;box-shadow:0 6px 20px rgba(29,122,29,.4)}
      .panews-head h3{font-family:var(--ff-display,'Bebas Neue',sans-serif);letter-spacing:1.5px;font-size:1.25rem;color:var(--y,#c9a227)}
      .panews-head p{font-size:.78rem;color:rgba(255,255,255,.5);max-width:540px;line-height:1.55}
      .panews-badge{display:inline-flex;gap:6px;padding:4px 10px;border-radius:20px;font-size:.58rem;font-weight:800;letter-spacing:.8px;text-transform:uppercase;background:rgba(46,204,46,.12);color:#2ecc2e;border:1px solid rgba(46,204,46,.28);margin-top:8px}
      .panews-form{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
      .panews-form input{flex:1;min-width:200px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:12px 14px;color:#fff;font-size:.85rem;outline:none}
      .panews-form input:focus{border-color:#2ecc2e;box-shadow:0 0 0 3px rgba(46,204,46,.12)}
      .panews-form button{padding:12px 22px;border-radius:8px;border:none;background:linear-gradient(135deg,#1d7a1d,#0d4d0d);color:#fff;font-weight:700;font-size:.78rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
      .panews-form button:disabled{opacity:.6;cursor:wait}
      .panews-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
      .panews-chip{padding:7px 12px;border-radius:20px;font-size:.68rem;font-weight:600;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);cursor:pointer;transition:all .2s}
      .panews-chip:hover{border-color:rgba(46,204,46,.4);color:#2ecc2e}
      .panews-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
      .panews-card{display:block;padding:14px 16px;border-radius:10px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.08);text-decoration:none;color:inherit;transition:transform .2s,border-color .2s;animation:panewsIn .4s ease both}
      .panews-card:hover{transform:translateY(-3px);border-color:rgba(29,122,29,.45)}
      .panews-card--local{border-color:rgba(46,204,46,.2)}
      .panews-card--feed{border-color:rgba(201,162,39,.15)}
      .panews-src{font-size:.58rem;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#2ecc2e;display:block;margin-bottom:6px}
      .panews-card--feed .panews-src{color:var(--y,#c9a227)}
      .panews-card strong{font-size:.82rem;line-height:1.35;display:block;margin-bottom:6px}
      .panews-card p{font-size:.72rem;color:rgba(255,255,255,.5);line-height:1.45;margin-bottom:8px}
      .panews-meta{font-size:.62rem;color:rgba(255,255,255,.35)}
      .panews-placeholder,.panews-loading{font-size:.8rem;color:rgba(255,255,255,.4);text-align:center;padding:24px;grid-column:1/-1}
      .panews-err{grid-column:1/-1;padding:14px;border-radius:8px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.25);color:#e74c3c;font-size:.8rem}
      .panews-intro{grid-column:1/-1;font-size:.82rem;color:rgba(255,255,255,.65);margin-bottom:4px}
      @keyframes panewsIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    `;
    document.head.appendChild(s);
  }

  async function runSearch(query) {
    const box = document.getElementById('panewsResults');
    if (!box || typeof PANewsIA === 'undefined') return;
    box.innerHTML = '<p class="panews-loading"><i class="fas fa-spinner fa-spin"></i> Lucas está buscando nas fontes de Pains e região…</p>';
    try {
      const res = await PANewsIA.search(query);
      if (!res.ok) {
        box.innerHTML = `<div class="panews-err">${res.message}<br><br><span style="font-size:.72rem">${res.hint || ''}</span></div>`;
        return;
      }
      box.innerHTML = `<p class="panews-intro">${res.intro}</p>${res.html}`;
    } catch (e) {
      box.innerHTML = `<div class="panews-err">${e.message || 'Erro na busca'}</div>`;
    }
  }

  function mount(container) {
    if (!container || mounted) return;
    injectStyles();
    mounted = true;

    container.innerHTML = `
      <div class="panews-section reveal">
        <div class="panews-head">
          <div class="panews-avatar"><i class="fas fa-search"></i></div>
          <div>
            <h3>IA de Notícias — Pains e Região</h3>
            <p><strong>Lucas Ferreira</strong> busca matérias publicadas no portal e fontes RSS — só Pains MG e Alto São Francisco Mineiro.</p>
            <span class="panews-badge"><i class="fas fa-shield-alt"></i> Busca rigorosa regional</span>
          </div>
        </div>
        <div class="panews-chips" id="panewsChips">
          <button type="button" class="panews-chip" data-q="notícias Pains MG">Pains MG</button>
          <button type="button" class="panews-chip" data-q="notícias Formiga região">Formiga</button>
          <button type="button" class="panews-chip" data-q="prefeitura Pains">Prefeitura</button>
          <button type="button" class="panews-chip" data-q="saúde Pains região">Saúde</button>
          <button type="button" class="panews-chip" data-q="polícia região MG">Polícia</button>
          <button type="button" class="panews-chip" data-q="eventos agenda Pains">Agenda</button>
        </div>
        <form class="panews-form" id="panewsForm">
          <input type="search" id="panewsInput" placeholder="Buscar notícia em Pains e região…" aria-label="Buscar notícias"/>
          <button type="submit"><i class="fas fa-search"></i> Buscar</button>
        </form>
        <div class="panews-results" id="panewsResults">
          <p class="panews-placeholder">Digite um assunto ou use os atalhos acima.</p>
        </div>
      </div>`;

    document.getElementById('panewsForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const q = document.getElementById('panewsInput')?.value?.trim();
      if (q) runSearch(q);
    });

    document.getElementById('panewsChips')?.addEventListener('click', e => {
      const chip = e.target.closest('[data-q]');
      if (!chip) return;
      const inp = document.getElementById('panewsInput');
      if (inp) inp.value = chip.dataset.q;
      runSearch(chip.dataset.q);
    });

    const params = new URLSearchParams(location.search);
    const nq = params.get('busca_noticia');
    if (nq) runSearch(nq);
  }

  return { mount, runSearch, injectStyles };
})();