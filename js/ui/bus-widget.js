/**
 * Widget IA de Ônibus — seção no portal + busca rigorosa
 */
const PABusWidget = (function () {
  let mounted = false;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function injectStyles() {
    if (document.getElementById('pabus-styles')) return;
    const s = document.createElement('style');
    s.id = 'pabus-styles';
    s.textContent = `
      .pabus-section{background:linear-gradient(165deg,rgba(13,77,13,.12),rgba(8,8,8,.6));border:1px solid rgba(29,122,29,.25);border-radius:14px;padding:clamp(20px,4vw,32px);margin-top:8px}
      .pabus-head{display:flex;flex-wrap:wrap;align-items:flex-start;gap:16px;margin-bottom:20px}
      .pabus-avatar{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#1a5276,#3498db);display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#fff;flex-shrink:0;box-shadow:0 6px 20px rgba(52,152,219,.35)}
      .pabus-head h3{font-family:var(--ff-display,'Bebas Neue',sans-serif);letter-spacing:1.5px;font-size:1.25rem;color:var(--y,#c9a227);margin-bottom:4px}
      .pabus-head p{font-size:.78rem;color:rgba(255,255,255,.5);max-width:520px;line-height:1.55}
      .pabus-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:.58rem;font-weight:800;letter-spacing:.8px;text-transform:uppercase;background:rgba(52,152,219,.15);color:#5dade2;border:1px solid rgba(52,152,219,.3);margin-top:8px}
      .pabus-form{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px}
      .pabus-form input,.pabus-form select{
        flex:1;min-width:140px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
        border-radius:8px;padding:12px 14px;color:#fff;font-size:.82rem;font-family:inherit;outline:none;
      }
      .pabus-form input:focus,.pabus-form select:focus{border-color:#3498db;box-shadow:0 0 0 3px rgba(52,152,219,.15)}
      .pabus-form select option{background:#1a1a1a}
      .pabus-form button{
        padding:12px 22px;border-radius:8px;border:none;background:linear-gradient(135deg,#1a5276,#3498db);
        color:#fff;font-weight:700;font-size:.78rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;
        transition:transform .2s,box-shadow .2s;white-space:nowrap;
      }
      .pabus-form button:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(52,152,219,.4)}
      .pabus-form button:disabled{opacity:.6;cursor:wait}
      .pabus-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}
      .pabus-chip{padding:7px 12px;border-radius:20px;font-size:.68rem;font-weight:600;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.55);cursor:pointer;transition:all .2s}
      .pabus-chip:hover{border-color:rgba(52,152,219,.4);color:#5dade2;background:rgba(52,152,219,.08)}
      .pabus-results{min-height:40px}
      .pabus-results .pabus-placeholder{font-size:.8rem;color:rgba(255,255,255,.4);text-align:center;padding:24px}
      .pabus-results .pabus-loading{color:#5dade2;font-size:.82rem;padding:16px;text-align:center}
      .pabus-result{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:16px 18px;margin-bottom:12px;animation:pabusIn .4s cubic-bezier(.16,1,.3,1) both}
      @keyframes pabusIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      .pabus-route-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;font-size:.88rem}
      .pabus-route-head i{color:#3498db}
      .pabus-arrow{color:rgba(255,255,255,.55);font-size:.78rem}
      .pabus-meta{display:flex;flex-wrap:wrap;gap:14px;font-size:.72rem;color:rgba(255,255,255,.5);margin-bottom:10px}
      .pabus-meta i{color:var(--g3,#2ecc2e);margin-right:4px}
      .pabus-stops{font-size:.72rem;color:rgba(255,255,255,.45);display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
      .pabus-stops i{width:14px;color:#3498db}
      .pabus-times{font-size:.78rem;line-height:1.7;color:rgba(255,255,255,.75);padding:10px 12px;background:rgba(255,255,255,.03);border-radius:6px}
      .pabus-note{font-size:.68rem;color:rgba(255,255,255,.4);margin-top:10px;font-style:italic}
      .pabus-err{padding:14px;border-radius:8px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.25);color:#e74c3c;font-size:.8rem}
      .pabus-intro{font-size:.82rem;color:rgba(255,255,255,.7);margin-bottom:14px;line-height:1.5}
    `;
    document.head.appendChild(s);
  }

  function cityOptions() {
    return PABusIA.listCities().map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
  }

  async function runSearch(query) {
    const box = document.getElementById('pabusResults');
    if (!box) return;
    box.innerHTML = '<p class="pabus-loading"><i class="fas fa-spinner fa-spin"></i> Tiago está consultando linhas rigorosas…</p>';
    try {
      const res = await PABusIA.search(query);
      if (!res.ok) {
        box.innerHTML = `<div class="pabus-err">${res.message}<br><br><span style="font-size:.72rem;opacity:.8">${res.hint || ''}</span></div>`;
        return;
      }
      box.innerHTML = `<p class="pabus-intro">${res.intro}</p>${res.html}`;
    } catch (e) {
      box.innerHTML = `<div class="pabus-err">${esc(e.message || 'Erro na busca')}</div>`;
    }
  }

  function buildQuery() {
    const o = document.getElementById('pabusOrigin')?.value;
    const d = document.getElementById('pabusDest')?.value;
    const day = document.getElementById('pabusDay')?.value;
    if (!o || !d) return '';
    const ol = PABusIA.CITIES[o]?.label || o;
    const dl = PABusIA.CITIES[d]?.label || d;
    let q = `ônibus de ${ol} para ${dl}`;
    if (day) q += ` ${day}`;
    return q;
  }

  function mount(container) {
    if (!container || mounted) return;
    injectStyles();
    mounted = true;

    container.innerHTML = `
      <div class="pabus-section reveal">
        <div class="pabus-head">
          <div class="pabus-avatar"><i class="fas fa-bus"></i></div>
          <div>
            <h3>IA de Ônibus — Pains e Região</h3>
            <p><strong>Tiago Ribeiro</strong> consulta linhas intermunicipais com busca rigorosa: só cidades do Alto São Francisco e Sudoeste de MG.</p>
            <span class="pabus-badge"><i class="fas fa-shield-alt"></i> Busca restrita à região</span>
          </div>
        </div>
        <div class="pabus-chips" id="pabusChips">
          <button type="button" class="pabus-chip" data-q="ônibus de Pains para Formiga">Pains → Formiga</button>
          <button type="button" class="pabus-chip" data-q="ônibus de Pains para Piumhi">Pains → Piumhi</button>
          <button type="button" class="pabus-chip" data-q="ônibus de Pains para Bambuí">Pains → Bambuí</button>
          <button type="button" class="pabus-chip" data-q="ônibus de Pains para Belo Horizonte">Pains → BH</button>
          <button type="button" class="pabus-chip" data-q="ônibus de Pains para Dores do Indaiá">Pains → Dores</button>
          <button type="button" class="pabus-chip" data-q="ônibus de Formiga para Divinópolis">Formiga → Divinópolis</button>
          <button type="button" class="pabus-chip" data-q="ônibus de Piumhi para Formiga">Piumhi → Formiga</button>
          <button type="button" class="pabus-chip" data-q="ônibus saindo de Pains hoje">Pains hoje</button>
        </div>
        <form class="pabus-form" id="pabusForm">
          <select id="pabusOrigin" aria-label="Origem" required>
            <option value="">Origem…</option>
            ${cityOptions()}
          </select>
          <select id="pabusDest" aria-label="Destino" required>
            <option value="">Destino…</option>
            ${cityOptions()}
          </select>
          <select id="pabusDay" aria-label="Dia">
            <option value="">Qualquer dia</option>
            <option value="segunda">Segunda</option>
            <option value="terça">Terça</option>
            <option value="quarta">Quarta</option>
            <option value="quinta">Quinta</option>
            <option value="sexta">Sexta</option>
            <option value="sábado">Sábado</option>
            <option value="domingo">Domingo</option>
            <option value="hoje">Hoje</option>
          </select>
          <button type="submit"><i class="fas fa-search"></i> Buscar linha</button>
        </form>
        <div class="pabus-results" id="pabusResults">
          <p class="pabus-placeholder">Selecione origem e destino ou use um atalho acima.</p>
        </div>
      </div>`;

    document.getElementById('pabusForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const q = buildQuery();
      if (!q) return;
      runSearch(q);
    });

    document.getElementById('pabusChips')?.addEventListener('click', e => {
      const chip = e.target.closest('[data-q]');
      if (!chip) return;
      runSearch(chip.dataset.q);
    });

    const params = new URLSearchParams(location.search);
    const busQ = params.get('busca_onibus');
    if (busQ) runSearch(busQ);
  }

  return { mount, runSearch, injectStyles };
})();