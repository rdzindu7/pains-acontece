(function () {
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function card(a, size) {
    const href = 'pages/noticia.html?id=' + a.id;
    if (size === 'xl') {
      return `<a href="${href}" class="ncard-xl reveal">
        <img src="${esc(a.img)}" alt="" loading="lazy"/>
        <div class="xl-grad"></div>
        <div class="xl-body">
          <div class="xl-cat">${esc(a.cat)}</div>
          <h3 class="xl-title">${esc(a.title)}</h3>
          <div class="xl-meta"><span><i class="fas fa-clock"></i> ${esc(a.timeAgo || a.date)}</span><span><i class="fas fa-eye"></i> ${Number(a.views||0).toLocaleString('pt-BR')}</span></div>
        </div>
      </a>`;
    }
    return `<a href="${href}" class="ncard reveal">
      <div class="thumb"><img src="${esc(a.img)}" alt="" loading="lazy"/><div class="thumb-overlay"></div><span class="cat-pill">${esc(a.cat)}</span></div>
      <div class="card-body">
        <h3 class="card-title">${esc(a.title)}</h3>
        <div class="card-foot"><span><i class="fas fa-clock"></i> ${esc(a.timeAgo || a.date)}</span><span class="views"><i class="fas fa-eye"></i> ${Number(a.views||0).toLocaleString('pt-BR')}</span></div>
      </div>
    </a>`;
  }

  function listRow(a) {
    return `<a href="pages/noticia.html?id=${a.id}" class="list-row reveal" style="display:flex;gap:16px;padding:16px 0;border-bottom:1px solid rgba(255,255,255,.04);align-items:flex-start;transition:background .2s">
      <img src="${esc(a.img)}" alt="" style="width:100px;height:72px;object-fit:cover;border-radius:3px;flex-shrink:0"/>
      <div style="flex:1;min-width:0">
        <div style="font-size:.62rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--g3);margin-bottom:4px">${esc(a.cat)}</div>
        <div style="font-size:.88rem;font-weight:600;line-height:1.4;color:var(--w)">${esc(a.title)}</div>
        <div style="font-size:.7rem;color:var(--dim);margin-top:6px"><i class="fas fa-clock"></i> ${esc(a.timeAgo || a.date)}</div>
      </div>
    </a>`;
  }

  const emptyMsg = '<p style="color:var(--dim);font-size:.82rem;padding:20px 0">Nenhuma notícia nesta seção.</p>';

  function renderHero(arts) {
    const el = document.getElementById('heroDynamic');
    if (!el) return;
    const hero = arts[0];
    if (!hero) {
      el.innerHTML = `
        <div class="hero-text">
          <div class="hero-eyebrow">
            <span class="dot"></span>
            <span class="label">Pains Acontece</span>
          </div>
          <h1 class="hero-title">Seu portal de notícias está <em>pronto</em></h1>
          <p class="hero-lead">Publique a primeira matéria pelo painel administrativo e ela aparecerá aqui automaticamente.</p>
          <a href="pages/login.html" class="btn-hero">Acessar painel <i class="fas fa-arrow-right arr"></i></a>
        </div>`;
      return;
    }
    el.innerHTML = `
      <div class="hero-text">
        <div class="hero-eyebrow">
          <span class="dot"></span>
          <span class="label">Manchete</span>
          <span class="sep"></span>
          <span class="cat">${esc(hero.cat)}</span>
        </div>
        <h1 class="hero-title">${esc(hero.title)}</h1>
        <p class="hero-lead">${esc(hero.lead || '')}</p>
        <div class="hero-meta">
          <span><i class="fas fa-user-circle"></i> ${esc(hero.author || 'Redação')}</span>
          <span><i class="fas fa-calendar"></i> ${esc(hero.date)}</span>
          <span><i class="fas fa-eye"></i> ${Number(hero.views||0).toLocaleString('pt-BR')} leituras</span>
        </div>
        <a href="pages/noticia.html?id=${hero.id}" class="btn-hero">Ler matéria completa <i class="fas fa-arrow-right arr"></i></a>
      </div>
      <a href="pages/noticia.html?id=${hero.id}" class="hero-card reveal">
        <img src="${esc(hero.img)}" alt="${esc(hero.title)}"/>
      </a>`;
    const reel = document.querySelector('.hero-reel');
    if (reel) reel.style.backgroundImage = `url('${hero.img}')`;
  }

  function renderTicker(arts) {
    const el = document.getElementById('tickerDynamic');
    if (!el) return;
    const items = arts.slice(0, 8);
    el.innerHTML = items.length
      ? items.map(a => `<span>${esc(a.title)}</span>`).join('')
      : '<span>Pains Acontece — notícias em tempo real da região</span>';
  }

  function renderBreaking(arts) {
    const el = document.getElementById('breakingDynamic');
    if (!el) return;
    el.innerHTML = arts.slice(1, 5).map(a =>
      `<a href="pages/noticia.html?id=${a.id}" class="breaking-item">${esc(a.title)}</a>`
    ).join('');
  }

  function renderSection(id, arts, mode) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!arts.length) { el.innerHTML = '<p style="color:var(--dim);font-size:.82rem;padding:20px 0">Nenhuma notícia nesta seção.</p>'; return; }
    if (mode === 'grid') el.innerHTML = arts.map(a => card(a)).join('');
    else if (mode === 'xl') el.innerHTML = card(arts[0], 'xl');
    else el.innerHTML = arts.map(a => listRow(a)).join('');
  }

  function renderJobs(jobs) {
    const el = document.getElementById('jobsDynamic');
    if (!el) return;
    if (!jobs.length) { el.innerHTML = emptyMsg; return; }
    el.innerHTML = jobs.map(j => `
      <div class="job-item" style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <div style="font-size:.82rem;font-weight:600">${esc(j.title)}</div>
        <div style="font-size:.68rem;color:var(--dim);margin-top:3px">${esc(j.type)} · ${esc(j.company)}</div>
      </div>`).join('');
  }

  function renderAgenda(events) {
    const el = document.getElementById('agendaDynamic');
    if (!el) return;
    if (!events.length) { el.innerHTML = emptyMsg; return; }
    el.innerHTML = events.map(e => `
      <div class="ag-item" style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <div style="background:rgba(29,122,29,.15);border-radius:4px;padding:8px 10px;text-align:center;flex-shrink:0;min-width:52px">
          <div style="font-family:var(--ff-display);font-size:.9rem;color:var(--y)">${esc(e.date?.split(' ')[0] || '')}</div>
          <div style="font-size:.6rem;color:var(--dim)">${esc(e.date?.split(' ')[1] || '')}</div>
        </div>
        <div>
          <div style="font-size:.8rem;font-weight:600">${esc(e.title)}</div>
          <div style="font-size:.68rem;color:var(--dim);margin-top:3px">${esc(e.time)} · ${esc(e.place)}</div>
        </div>
      </div>`).join('');
  }

  async function init() {
    await PAStore.init();
    const pub = PAStore.getArticles('pub');
    const byCat = (cat, n) => pub.filter(a => a.cat === cat).slice(0, n);

    renderHero(pub);
    renderTicker(pub);
    renderBreaking(pub);
    renderSection('ultimasGrid', pub.slice(0, 6), 'grid');
    renderSection('policiaFeatured', byCat('Polícia', 1), 'xl');
    renderSection('policiaList', byCat('Polícia', 1).slice(1, 4).concat(byCat('Polícia', 4).slice(1)), 'list');
    if (!byCat('Polícia', 1).length) {
      document.getElementById('policiaFeatured').innerHTML = '';
      document.getElementById('policiaList').innerHTML = pub.slice(0, 3).map(a => listRow(a)).join('');
    }
    renderSection('politicaList', byCat('Política', 4), 'list');
    renderSection('saudeGrid', byCat('Saúde', 3), 'grid');
    renderSection('brasilList', byCat('Brasil / Mundo', 4).concat(byCat('Últimas Notícias', 2)), 'list');
    renderSection('regiaoGrid', byCat('Região', 3).concat(byCat('Pains', 3)), 'grid');

    try {
      const [jobs, events] = await Promise.all([PAAPI.getJobs(), PAAPI.getEvents()]);
      renderJobs(jobs);
      renderAgenda(events);
    } catch {
      renderJobs([]);
      renderAgenda([]);
    }

    const search = document.getElementById('siteSearch');
    if (search) {
      search.addEventListener('input', function () {
        const q = this.value.toLowerCase();
        if (!q) return;
        const match = pub.find(a => a.title.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q));
        if (match) location.href = 'pages/noticia.html?id=' + match.id;
      });
    }
  }

  window.enviarPauta = async function (e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      nome: form.querySelector('[aria-label="Nome"]')?.value,
      whatsapp: form.querySelector('[aria-label="WhatsApp"]')?.value,
      assunto: form.querySelector('[aria-label="Assunto"]')?.value,
      descricao: form.querySelector('[aria-label="Descrição"]')?.value
    };
    try {
      await PAAPI.sendPauta(data);
      alert('Pauta enviada com sucesso! Nossa redação entrará em contato.');
      form.reset();
    } catch {
      alert('Pauta registrada! Entraremos em contato em breve.');
      form.reset();
    }
  };

  init();
})();