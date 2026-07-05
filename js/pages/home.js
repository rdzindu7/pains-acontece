(function () {
  const NAV_MAP = {
    home:        { type: 'all' },
    ultimas:     { type: 'scroll', target: '#ultimas' },
    pains:       { type: 'news', title: 'Pains', cats: ['Pains'] },
    regiao:      { type: 'news', title: 'Região', cats: ['Região'] },
    brasil:      { type: 'news', title: 'Brasil / Mundo', cats: ['Brasil / Mundo'] },
    policia:     { type: 'news', title: 'Polícia', cats: ['Polícia'] },
    politica:    { type: 'news', title: 'Política', cats: ['Política'] },
    saude:       { type: 'news', title: 'Saúde', cats: ['Saúde'] },
    agenda:      { type: 'scroll', target: '#agenda' },
    empregos:    { type: 'scroll', target: '#empregos' },
    restaurantes:{ type: 'scroll', target: '#restaurantes' },
    telefones:   { type: 'scroll', target: '#telefones', highlight: true },
    clima:       { type: 'scroll', target: '#clima-section', highlight: true },
    contato:     { type: 'scroll', target: '#contato', highlight: true }
  };

  let allPub = [];
  let currentNav = 'home';

  function isOwnerView() {
    return typeof PAAPI !== 'undefined' && PAAPI.isOwner();
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function showToast(msg, type) {
    const wrap = document.getElementById('paToastWrap');
    if (!wrap) return;
    const t = document.createElement('div');
    t.className = 'pa-toast' + (type === 'error' ? ' error' : '');
    t.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i><span>${esc(msg)}</span>`;
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, 4500);
  }

  function setLoading(on, msg) {
    document.getElementById('paLoadingBar')?.classList.toggle('active', !!on);
    const st = document.getElementById('paLoadingStatus');
    if (st) {
      st.classList.toggle('active', !!on && !!msg);
      if (msg) st.textContent = msg;
    }
  }

  function isTodayArticle(a) {
    if (typeof PAScanner !== 'undefined' && PAScanner.isFreshNews) {
      if (a.pubISO) return PAScanner.isFreshNews(new Date(a.pubISO));
      if (a.date) {
        const p = a.date.split('/');
        if (p.length === 3) return PAScanner.isFreshNews(new Date(+p[2], +p[1] - 1, +p[0]));
      }
      return (a.timeAgo || '').includes('min') || (a.timeAgo || '').includes('hora');
    }
    return true;
  }

  function filterToday(arts) {
    const today = arts.filter(isTodayArticle);
    return today.length ? today : arts;
  }

  function quickBtn(id) {
    return `<span class="quick-btn" onclick="event.preventDefault();event.stopPropagation();location.href='pages/noticia.html?id=${id}&mode=quick'"><i class="fas fa-bolt"></i> Rápida</span>`;
  }

  function card(a, size) {
    const href = 'pages/noticia.html?id=' + a.id;
    if (size === 'xl') {
      return `<a href="${href}" class="ncard-xl reveal">
        <img src="${esc(a.img)}" alt="" loading="lazy"/>
        ${quickBtn(a.id)}
        <div class="xl-grad"></div>
        <div class="xl-body">
          <div class="xl-cat">${esc(a.cat)}${a.verified ? ' <i class="fas fa-check-circle" style="font-size:.55rem;color:#2ecc2e" title="Verificado"></i>' : ''}</div>
          <h3 class="xl-title">${esc(a.title)}</h3>
          <div class="xl-meta"><span><i class="fas fa-clock"></i> ${esc(a.timeAgo || a.date)}</span><span><i class="fas fa-eye"></i> ${Number(a.views||0).toLocaleString('pt-BR')}</span></div>
        </div>
      </a>`;
    }
    return `<a href="${href}" class="ncard reveal">
      <div class="thumb"><img src="${esc(a.img)}" alt="" loading="lazy"/><div class="thumb-overlay"></div>${quickBtn(a.id)}<span class="cat-pill">${esc(a.cat)}</span></div>
      <div class="card-body">
        <h3 class="card-title">${esc(a.title)}</h3>
        <div class="card-foot"><span><i class="fas fa-clock"></i> ${esc(a.timeAgo || a.date)}</span><span class="views"><i class="fas fa-eye"></i> ${Number(a.views||0).toLocaleString('pt-BR')}</span></div>
      </div>
    </a>`;
  }

  function listRow(a) {
    return `<a href="pages/noticia.html?id=${a.id}" class="nlist-item reveal">
      <div class="t"><img src="${esc(a.img)}" alt="" loading="lazy"/></div>
      <div class="inf">
        <div class="tag">${esc(a.cat)}${a.verified ? ' ✓' : ''}</div>
        <div class="ttl">${esc(a.title)}</div>
        <div class="time"><i class="fas fa-clock"></i> ${esc(a.timeAgo || a.date)}</div>
      </div>
    </a>`;
  }

  const emptyMsg = isOwnerView()
    ? '<p style="color:var(--dim);font-size:.82rem;padding:20px 0">Nenhuma notícia nesta seção. A IA está buscando fatos verificados…</p>'
    : '<p style="color:var(--dim);font-size:.82rem;padding:20px 0">Nenhuma notícia nesta seção no momento. Volte em breve!</p>';

  function filterByCats(arts, cats) {
    if (!cats) return arts;
    return arts.filter(a => cats.includes(a.cat));
  }

  function renderHero(arts) {
    const el = document.getElementById('heroDynamic');
    if (!el) return;
    const hero = arts[0];
    if (!hero) {
      const iaBtn = isOwnerView()
        ? '<button type="button" class="btn-hero" onclick="PAPublicIA.runSearch()">Buscar agora <i class="fas fa-rss arr"></i></button>'
        : '';
      el.innerHTML = `
        <div class="hero-text">
          <div class="hero-eyebrow">
            <span class="dot"></span>
            <span class="label">${isOwnerView() ? 'IA Ativa' : 'Pains Acontece'}</span>
          </div>
          <h1 class="hero-title">${isOwnerView() ? 'Buscando notícias <em>verificadas</em> de Pains' : 'Notícias de <em>Pains</em> e região'}</h1>
          <p class="hero-lead">${isOwnerView()
            ? 'Nossa IA editorial está varrendo fontes de Pains MG, região, Brasil e mundo. As matérias aparecem aqui automaticamente.'
            : 'O portal de notícias hiperlocal do Sudoeste Mineiro. Fique por dentro do que acontece na sua cidade.'}</p>
          ${iaBtn}
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
          ${hero.verified ? '<span><i class="fas fa-check-circle"></i> Verificado pela IA</span>' : ''}
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
    const items = arts.slice(0, 10);
    el.innerHTML = items.length
      ? items.map(a => `<span>${esc(a.title)}</span>`).join('')
      : '<span>Pains Acontece — IA buscando notícias em tempo real</span>';
  }

  function renderBreaking(arts) {
    const el = document.getElementById('breakingDynamic');
    if (!el) return;
    el.innerHTML = arts.slice(1, 6).map(a =>
      `<a href="pages/noticia.html?id=${a.id}" class="breaking-item">${esc(a.title)}</a>`
    ).join('') || '<span class="breaking-item" style="cursor:default;opacity:.5">Aguardando destaques…</span>';
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
        ? `${arts.length} notícia${arts.length > 1 ? 's' : ''} verificada${arts.length > 1 ? 's' : ''}`
        : 'A IA está buscando matérias nesta categoria…';
    }
    if (viewEl) viewEl.setAttribute('aria-hidden', 'false');

    if (!featEl || !gridEl) return;

    if (!arts.length) {
      const iaBtn = isOwnerView()
        ? '<button type="button" onclick="PAPublicIA.runSearch()" style="margin-top:16px;padding:10px 20px;background:var(--g);border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:.75rem;font-weight:700">Buscar com IA</button>'
        : '';
      featEl.innerHTML = '';
      gridEl.innerHTML = `<div style="grid-column:1/-1;padding:40px 0;text-align:center;color:var(--dim)">
        <i class="fas fa-satellite-dish" style="font-size:2rem;opacity:.3;margin-bottom:12px;display:block"></i>
        Nenhuma notícia nesta categoria ainda.<br>
        ${iaBtn}
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
      <div class="job-item">
        <div class="job-ttl">${esc(j.title)}</div>
        <div class="job-co"><i class="fas fa-building"></i> ${esc(j.company)} · ${esc(j.type)}</div>
      </div>`).join('');
  }

  function renderAgenda(events) {
    const el = document.getElementById('agendaDynamic');
    if (!el) return;
    if (!events.length) { el.innerHTML = emptyMsg; return; }
    el.innerHTML = events.map(e => `
      <div class="ag-item">
        <div class="ag-date">
          <div class="dd">${esc(e.date?.split(' ')[0] || '')}</div>
          <div class="mm">${esc(e.date?.split(' ')[1] || '')}</div>
        </div>
        <div class="ag-info">
          <div class="ev-t">${esc(e.title)}</div>
          <div class="ev-l"><i class="fas fa-map-marker-alt"></i> ${esc(e.place)} · ${esc(e.time)}</div>
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
    renderSection('politicaList', byCat('Política', 5), 'list');
    renderSection('saudeGrid', byCat('Saúde', 3), 'grid');
    renderSection('brasilList', byCat('Brasil / Mundo', 10), 'list');
    renderSection('regiaoGrid', byCat('Região', 6), 'grid');
    observeReveals();
  }

  function observeReveals() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
  }

  function setupPhoneSearch() {
    const input = document.getElementById('phoneSearch');
    const items = document.querySelectorAll('#phoneGrid .ph-item');
    if (!input || !items.length) return;
    input.addEventListener('input', function () {
      const q = this.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      items.forEach(el => {
        const name = (el.dataset.name || el.textContent || '').toLowerCase();
        el.classList.toggle('hidden', q.length > 0 && !name.includes(q));
      });
    });
  }

  function highlightSection(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('section-highlight');
    setTimeout(() => el.classList.remove('section-highlight'), 2400);
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
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (cfg.highlight) highlightSection(cfg.target);
        }, 80);
      }
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
    document.querySelectorAll('a[data-nav]').forEach(link => {
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

  window.PAHomeRefresh = function () {
    allPub = PAStore.getArticles('pub');
    if (currentNav === 'home') renderHome();
    else applyNav(currentNav);
  };

  window.applyNav = applyNav;

  function applyArticles(raw, gated) {
    allPub = filterToday(gated?.length ? gated : raw.filter(a => a.verified !== false && (a.confidence || 0) >= 55));
    if (currentNav === 'home') renderHome();
    else applyNav(currentNav);
  }

  async function runBackgroundSearch() {
    if (!isOwnerView()) return;
    setLoading(true, 'IA buscando novas notícias…');
    try {
      if (typeof PAAutoPublisher !== 'undefined') {
        const onProgress = e => {
          const d = e.detail;
          if (d) setLoading(true, `Verificando ${d.current}/${d.total}…`);
        };
        window.addEventListener('pa-deep-verify', onProgress);
        const result = await PAAutoPublisher.run();
        window.removeEventListener('pa-deep-verify', onProgress);
        if (result.published > 0) {
          await PAStore.init();
          applyArticles(PAStore.getArticles('pub'));
          showToast(`${result.published} notícia(s) verificada(s) publicada(s) pela IA`, 'success');
        }
      }
    } catch {}
    setLoading(false, '');
  }

  async function init() {
    await PAStore.init();
    const raw = PAStore.getArticles('pub');

    applyArticles(raw, raw.filter(a => a.verified !== false && (a.confidence || 0) >= 55));

    setupNav();
    setupPhoneSearch();
    observeReveals();

    if (typeof PAWeather !== 'undefined') {
      PAWeather.renderAll().catch(() => {});
    }

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
      search.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        const q = this.value.toLowerCase().trim();
        if (!q) return;
        const matches = allPub.filter(a =>
          a.title.toLowerCase().includes(q) || a.cat.toLowerCase().includes(q) || (a.lead || '').toLowerCase().includes(q)
        );
        if (matches.length === 1) {
          location.href = 'pages/noticia.html?id=' + matches[0].id;
        } else if (matches.length > 1) {
          applyNav('ultimas');
          showToast(`${matches.length} resultados para "${this.value}"`, 'success');
        } else {
          showToast(isOwnerView() ? 'Nenhuma notícia encontrada. Tente "buscar" na IA.' : 'Nenhuma notícia encontrada.', 'error');
        }
      });
    }

    if (typeof PAContentGate !== 'undefined' && raw.length) {
      PAContentGate.gate(raw, null, { fast: true }).then(gated => {
        if (gated.length) applyArticles(raw, gated);
      }).catch(() => {});
    }

    runBackgroundSearch();
  }

  window.enviarPauta = async function (e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.btn-pauta');
    const data = {
      nome: form.querySelector('[aria-label="Nome"]')?.value,
      whatsapp: form.querySelector('[aria-label="WhatsApp"]')?.value,
      assunto: form.querySelector('[aria-label="Assunto"]')?.value,
      descricao: form.querySelector('[aria-label="Descrição"]')?.value
    };
    btn?.classList.add('loading');
    btn.disabled = true;
    try {
      const res = await PAAPI.sendPauta(data);
      showToast(res.message || 'Pauta enviada! Nossa redação entrará em contato.');
      form.reset();
      btn?.classList.add('success');
      setTimeout(() => btn?.classList.remove('success'), 2000);
    } catch {
      showToast('Pauta registrada localmente. Entraremos em contato em breve.');
      form.reset();
    }
    btn?.classList.remove('loading');
    btn.disabled = false;
  };

  init();
})();