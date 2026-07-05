(function () {
  const NAV_MAP = {
    home:        { type: 'all' },
    ultimas:     { type: 'news', title: 'Últimas Notícias', cats: null },
    pains:       { type: 'news', title: 'Pains', cats: ['Pains'] },
    regiao:      { type: 'news', title: 'Região', cats: ['Região'] },
    brasil:      { type: 'news', title: 'Brasil / Mundo', cats: ['Brasil / Mundo'] },
    policia:     { type: 'news', title: 'Polícia', cats: ['Polícia'] },
    politica:    { type: 'news', title: 'Política', cats: ['Política'] },
    saude:       { type: 'news', title: 'Saúde', cats: ['Saúde'] },
    agenda:      { type: 'news', title: 'Agenda', cats: ['Agenda'] },
    empregos:    { type: 'news', title: 'Empregos', cats: ['Empregos'] },
    restaurantes:{ type: 'news', title: 'Restaurantes & Gastronomia', cats: ['Gastronomia'] },
    telefones:   { type: 'scroll', target: '#telefones' },
    clima:       { type: 'scroll', target: '#clima' },
    contato:     { type: 'scroll', target: '#contato' }
  };

  let allPub = [];
  let currentNav = 'home';

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

  function filterByCats(arts, cats) {
    if (!cats) return arts;
    return arts.filter(a => cats.includes(a.cat));
  }

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
    if (!arts.length) { el.innerHTML = emptyMsg; return; }
    if (mode === 'grid') el.innerHTML = arts.map(a => card(a)).join('');
    else if (mode === 'xl') el.innerHTML = card(arts[0], 'xl');
    else el.innerHTML = arts.map(a => listRow(a)).join('');
  }

  function renderCategoryView(arts, title) {
    const titleEl = document.getElementById('categoryTitle');
    const countEl = document.getElementById('categoryCount');
    const featEl = document.getElementById('categoryFeatured');
    const gridEl = document.getElementById('categoryGrid');
    const viewEl = document.getElementById('categoryView');

    if (titleEl) titleEl.textContent = title;
    if (countEl) {
      countEl.textContent = arts.length
        ? `${arts.length} notícia${arts.length > 1 ? 's' : ''} encontrada${arts.length > 1 ? 's' : ''}`
        : 'Nenhuma notícia publicada nesta categoria ainda';
    }
    if (viewEl) viewEl.setAttribute('aria-hidden', 'false');

    if (!featEl || !gridEl) return;

    if (!arts.length) {
      featEl.innerHTML = '';
      gridEl.innerHTML = `<div style="grid-column:1/-1;padding:40px 0;text-align:center;color:var(--dim)">
        <i class="fas fa-newspaper" style="font-size:2rem;opacity:.3;margin-bottom:12px;display:block"></i>
        Nenhuma notícia nesta categoria.<br><span style="font-size:.78rem;margin-top:8px;display:inline-block">Publique pelo painel admin com a categoria <strong>${esc(title)}</strong>.</span>
      </div>`;
      return;
    }

    featEl.innerHTML = card(arts[0], 'xl');
    const rest = arts.slice(1);
    gridEl.innerHTML = rest.length
      ? rest.map(a => card(a)).join('')
      : `<div style="grid-column:1/-1;color:var(--dim);font-size:.8rem;padding:8px 0">Esta é a única notícia nesta categoria.</div>`;
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

  function renderHome() {
    const pub = allPub;
    const byCat = (cat, n) => pub.filter(a => a.cat === cat).slice(0, n);

    renderHero(pub);
    renderTicker(pub);
    renderBreaking(pub);
    renderSection('ultimasGrid', pub.slice(0, 6), 'grid');
    renderSection('policiaFeatured', byCat('Polícia', 1), 'xl');
    renderSection('policiaList', byCat('Polícia', 4).slice(1), 'list');
    if (!byCat('Polícia', 1).length) {
      const pf = document.getElementById('policiaFeatured');
      const pl = document.getElementById('policiaList');
      if (pf) pf.innerHTML = emptyMsg;
      if (pl) pl.innerHTML = '';
    }
    renderSection('politicaList', byCat('Política', 4), 'list');
    renderSection('saudeGrid', byCat('Saúde', 3), 'grid');
    renderSection('brasilList', byCat('Brasil / Mundo', 4), 'list');
    renderSection('regiaoGrid', byCat('Região', 6), 'grid');
  }

  function setActiveNav(navKey) {
    document.querySelectorAll('.nav-item a[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === navKey);
    });
  }

  function applyNav(navKey, scrollTo) {
    const cfg = NAV_MAP[navKey] || NAV_MAP.home;
    currentNav = navKey;
    setActiveNav(navKey);

    if (cfg.type === 'all') {
      document.body.classList.remove('cat-filter-mode');
      const viewEl = document.getElementById('categoryView');
      if (viewEl) viewEl.setAttribute('aria-hidden', 'true');
      renderHome();
      if (scrollTo) {
        const el = document.querySelector(scrollTo);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (cfg.type === 'scroll') {
      document.body.classList.remove('cat-filter-mode');
      const viewEl = document.getElementById('categoryView');
      if (viewEl) viewEl.setAttribute('aria-hidden', 'true');
      renderHome();
      const el = document.querySelector(cfg.target);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      return;
    }

    if (cfg.type === 'news') {
      document.body.classList.add('cat-filter-mode');
      const filtered = filterByCats(allPub, cfg.cats);
      renderCategoryView(filtered, cfg.title);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function setupNav() {
    document.querySelectorAll('.nav-item a[data-nav]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const navKey = link.dataset.nav;
        applyNav(navKey);
        document.getElementById('navInner')?.classList.remove('open');
        if (navKey !== 'home') {
          history.replaceState(null, '', '#' + navKey);
        } else {
          history.replaceState(null, '', location.pathname);
        }
      });
    });

    const hash = location.hash.replace('#', '');
    if (hash && NAV_MAP[hash]) {
      applyNav(hash);
    }
  }

  async function init() {
    await PAStore.init();
    allPub = PAStore.getArticles('pub');
    renderHome();
    setupNav();

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
        const match = allPub.find(a => a.title.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q));
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