(function () {
  const NAV_MAP = {
    home:        { type: 'all' },
    ultimas:     { type: 'news', title: 'Últimas Notícias', filter: 'homeall' },
    pains:       { type: 'news', title: 'Pains', cats: ['Pains'] },
    regiao:      { type: 'news', title: 'Região', cats: ['Região'] },
    brasil:      { type: 'news', title: 'Brasil', filter: 'brasil' },
    mundo:       { type: 'news', title: 'Mundo', filter: 'mundo' },
    policia:     { type: 'news', title: 'Polícia', cats: ['Polícia'] },
    politica:    { type: 'news', title: 'Política', cats: ['Política'] },
    saude:       { type: 'news', title: 'Saúde', cats: ['Saúde'] },
    agenda:      { type: 'scroll', target: '#agenda' },
    empregos:    { type: 'scroll', target: '#empregos' },
    servicos:    { type: 'scroll', target: '#servicos', highlight: true },
    restaurantes:{ type: 'scroll', target: '#restaurantes', highlight: true },
    onibus:      { type: 'scroll', target: '#onibus', highlight: true },
    buscanoticias: { type: 'scroll', target: '#busca-noticias', highlight: true },
    telefones:   { type: 'scroll', target: '#telefones', highlight: true },
    clima:       { type: 'scroll', target: '#clima-section', highlight: true },
    contato:     { type: 'scroll', target: '#contato', highlight: true },
    publicidades:{ type: 'scroll', target: '#publicidades', highlight: true }
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

  function articlePubDate(a) {
    if (a.pubISO) {
      const d = new Date(a.pubISO);
      if (!isNaN(d.getTime())) return d;
    }
    if (a.date) {
      const p = a.date.split('/');
      if (p.length === 3) return new Date(+p[2], +p[1] - 1, +p[0]);
    }
    return null;
  }

  function isRecentArticle(a) {
    if (typeof PAScanner !== 'undefined' && PAScanner.isFreshNews) {
      const pd = articlePubDate(a);
      if (pd) return PAScanner.isFreshNews(pd);
      return (a.timeAgo || '').includes('min') || (a.timeAgo || '').includes('hora') || (a.timeAgo || '').includes('dia');
    }
    return true;
  }

  function filterRecent(arts) {
    const recent = arts.filter(isRecentArticle);
    return recent.length ? recent : arts;
  }

  function pubLabel(a) {
    if (typeof PAScanner !== 'undefined' && PAScanner.formatPubLabel) {
      const pd = articlePubDate(a);
      if (pd) return PAScanner.formatPubLabel(pd, a.pubISO);
    }
    return a.date || a.timeAgo || '';
  }

  function filterForDisplay(arts) {
    const pool = (arts || []).filter(a => a.status !== 'draft' && a.status !== 'rejected' && a.status !== 'pending');
    const quality = pool.filter(a => a.verified !== false && (a.confidence ?? 70) >= 45);
    const list = quality.length ? quality : pool.filter(a => a.verified !== false);
    const fallback = list.length ? list : pool;
    if (!fallback.length) return [];
    if (isOwnerView()) return filterRecent(fallback);
    return sortByRecent(fallback);
  }

  function quickBtn(id) {
    return `<span class="quick-btn" onclick="event.preventDefault();event.stopPropagation();location.href='pages/noticia.html?id=${id}&mode=quick'"><i class="fas fa-bolt"></i> Rápida</span>`;
  }

  function imgTag(a) {
    if (typeof PAArticleImages !== 'undefined' && PAArticleImages.imgHtml) {
      return PAArticleImages.imgHtml(a);
    }
    const fb = (typeof PAPainsMedia !== 'undefined') ? PAPainsMedia.pick(a.cat) : '';
    const src = a.img || fb;
    const onerr = fb ? ` onerror="this.onerror=null;this.src='${fb.replace(/'/g, '%27')}'"` : '';
    return `<img src="${esc(src)}" alt="" loading="lazy"${onerr}/>`;
  }

  function card(a, size) {
    const href = 'pages/noticia.html?id=' + a.id;
    const views = Number(a.views || 0).toLocaleString('pt-BR');
    if (size === 'xl') {
      return `<a href="${href}" class="ncard-xl reveal">
        ${imgTag(a)}
        ${quickBtn(a.id)}
        <div class="xl-grad"></div>
        <div class="xl-body">
          <div class="xl-cat">${esc(a.cat)}${a.verified ? ' <i class="fas fa-check-circle" style="font-size:.55rem;color:#2ecc2e" title="Verificado"></i>' : ''}</div>
          <h3 class="xl-title">${esc(a.title)}</h3>
          <div class="xl-meta"><span><i class="fas fa-calendar-alt"></i> ${esc(pubLabel(a))}</span><span><i class="fas fa-eye"></i> <span data-pa-views="${a.id}">${views}</span></span></div>
        </div>
      </a>`;
    }
    return `<a href="${href}" class="ncard reveal">
      <div class="thumb">${imgTag(a)}<div class="thumb-overlay"></div>${quickBtn(a.id)}<span class="cat-pill">${esc(a.cat)}</span></div>
      <div class="card-body">
        <h3 class="card-title">${esc(a.title)}</h3>
        <div class="card-foot"><span><i class="fas fa-calendar-alt"></i> ${esc(pubLabel(a))}</span><span class="views"><i class="fas fa-eye"></i> <span data-pa-views="${a.id}">${views}</span></span></div>
      </div>
    </a>`;
  }

  function listRow(a) {
    return `<a href="pages/noticia.html?id=${a.id}" class="nlist-item reveal">
      <div class="t">${imgTag(a)}</div>
      <div class="inf">
        <div class="tag">${esc(a.cat)}${a.verified ? ' ✓' : ''}</div>
        <div class="ttl">${esc(a.title)}</div>
        <div class="time"><i class="fas fa-calendar-alt"></i> ${esc(pubLabel(a))}</div>
      </div>
    </a>`;
  }

  function emptyMsgHtml() {
    const txt = typeof PATranslate !== 'undefined'
      ? PATranslate.t('empty.section')
      : 'Nenhuma notícia nesta seção no momento. Volte em breve!';
    if (isOwnerView()) {
      return '<p style="color:var(--dim);font-size:.82rem;padding:20px 0">Nenhuma notícia nesta seção. A IA está buscando fatos verificados…</p>';
    }
    return `<p style="color:var(--dim);font-size:.82rem;padding:20px 0">${txt}</p>`;
  }

  function filterByCats(arts, cats) {
    if (!cats) return arts;
    return arts.filter(a => cats.includes(a.cat));
  }

  function sortByRecent(arts) {
    return [...(arts || [])].sort((a, b) => {
      const da = a.pubISO ? new Date(a.pubISO).getTime() : 0;
      const db = b.pubISO ? new Date(b.pubISO).getTime() : 0;
      if (db !== da) return db - da;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }

  function filterByScope(arts, scope) {
    if (!scope) return arts;
    if (scope === 'homeall') return sortByRecent(forHomePage(arts));
    if (typeof PAArticleScope === 'undefined') return arts;
    if (scope === 'mundo') return sortByRecent(PAArticleScope.forMundo(arts));
    if (scope === 'brasil') return sortByRecent(PAArticleScope.forBrasil(arts));
    return arts;
  }

  function forHomePage(arts) {
    return typeof PAArticleScope !== 'undefined' ? PAArticleScope.forHome(arts) : arts;
  }

  function revealVisibleNow(rootSelector) {
    const root = rootSelector ? document.querySelector(rootSelector) : document;
    const nodes = root
      ? root.querySelectorAll('.reveal:not(.visible)')
      : document.querySelectorAll('.reveal:not(.visible)');
    const vh = window.innerHeight || document.documentElement.clientHeight;
    nodes.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh + 80 && r.bottom > -40) el.classList.add('visible');
    });
  }

  function renderHero(arts) {
    const el = document.getElementById('heroDynamic');
    if (!el) return;
    const hero = arts[0];
    document.querySelector('.hero')?.classList.toggle('hero-compact', !hero);
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
            : 'O portal de notícias hiperlocal do Sudoeste Mineiro. <strong>Dúvidas sobre alguma matéria?</strong> Clique no botão verde <i class="fas fa-users"></i> no canto da tela — nossa equipe IA responde na hora.'}</p>
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
          <span><i class="fas fa-calendar-alt"></i> ${esc(pubLabel(hero))}</span>
          <span><i class="fas fa-eye"></i> ${Number(hero.views||0).toLocaleString('pt-BR')} leituras</span>
          ${hero.verified ? '<span><i class="fas fa-check-circle"></i> Verificado pela IA</span>' : ''}
        </div>
        <a href="pages/noticia.html?id=${hero.id}" class="btn-hero">Ler matéria completa <i class="fas fa-arrow-right arr"></i></a>
      </div>
      <a href="pages/noticia.html?id=${hero.id}" class="hero-card reveal">
        ${typeof PAArticleImages !== 'undefined' && PAArticleImages.imgHtml ? PAArticleImages.imgHtml(hero, ' loading="eager"') : `<img src="${esc(hero.img)}" alt="${esc(hero.title)}" loading="eager"/>`}
      </a>`;
    const reel = document.querySelector('.hero-reel');
    const reelImg = (typeof PAArticleImages !== 'undefined' && PAArticleImages.displayPath) ? PAArticleImages.displayPath(hero) : hero.img;
    if (reel) reel.style.backgroundImage = `url('${reelImg}')`;
  }

  function renderTicker(arts) {
    const items = arts.slice(0, 10);
    if (typeof PAAds !== 'undefined') {
      PAAds.renderTicker(items);
      return;
    }
    const el = document.getElementById('tickerDynamic');
    if (!el) return;
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
    if (!arts.length) { el.innerHTML = emptyMsgHtml(); return; }
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
    observeReveals();
    requestAnimationFrame(() => revealVisibleNow('#categoryView'));
  }

  function renderJobs(jobs) {
    const el = document.getElementById('jobsDynamic');
    if (!el) return;
    if (!jobs.length) { el.innerHTML = emptyMsgHtml(); return; }
    el.innerHTML = jobs.map(j => `
      <div class="job-item">
        <div class="job-ttl">${esc(j.title)}</div>
        <div class="job-co"><i class="fas fa-building"></i> ${esc(j.company)} · ${esc(j.type)}</div>
      </div>`).join('');
  }

  function renderAgenda(events) {
    const el = document.getElementById('agendaDynamic');
    if (!el) return;
    if (!events.length) { el.innerHTML = emptyMsgHtml(); return; }
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
    const pub = forHomePage(allPub);
    const byCat = (cat, n) => {
      if (cat === 'Brasil' && typeof PAArticleScope !== 'undefined') {
        return PAArticleScope.forBrasil(pub).slice(0, n);
      }
      return pub.filter(a => a.cat === cat).slice(0, n);
    };

    renderHero(pub);
    renderTicker(pub);
    if (typeof PAAds !== 'undefined') PAAds.renderAll(pub);
    renderBreaking(pub);
    renderSection('ultimasGrid', pub.slice(0, 6), 'grid');
    renderSection('policiaFeatured', byCat('Polícia', 1), 'xl');
    renderSection('policiaList', byCat('Polícia', 4).slice(1), 'list');
    if (!byCat('Polícia', 1).length) {
      const pf = document.getElementById('policiaFeatured');
      const pl = document.getElementById('policiaList');
      if (pf) pf.innerHTML = emptyMsgHtml();
      if (pl) pl.innerHTML = '';
    }
    renderSection('politicaList', byCat('Política', 5), 'list');
    renderSection('saudeGrid', byCat('Saúde', 3), 'grid');
    renderSection('brasilList', byCat('Brasil', 10), 'list');
    renderSection('regiaoGrid', byCat('Região', 6), 'grid');
    observeReveals();
    requestAnimationFrame(() => {
      revealVisibleNow('#ultimas');
      revealVisibleNow('.hero');
    });
  }

  let revealObserver = null;

  function observeReveals() {
    if (window.innerWidth <= 768) {
      document.querySelectorAll(
        '#ultimasGrid .reveal, #categoryGrid .reveal, #categoryFeatured .reveal, .feat-2col .reveal, .section .reveal'
      ).forEach(el => el.classList.add('visible'));
    }
    revealVisibleNow();
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            revealObserver.unobserve(e.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
    }
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => revealObserver.observe(el));
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
      const filtered = cfg.filter
        ? filterByScope(allPub, cfg.filter)
        : sortByRecent(filterByCats(allPub, cfg.cats));
      const title = (typeof PATranslate !== 'undefined' && navKey === 'ultimas')
        ? PATranslate.t('sec.ultimas')
        : cfg.title;
      renderCategoryView(filtered, title);
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
    let pool = gated?.length ? gated : raw;
    if (typeof PAViewsTracker !== 'undefined') pool = PAViewsTracker.mergeArticles(pool);
    allPub = filterForDisplay(pool);
    if (currentNav === 'home') renderHome();
    else applyNav(currentNav);
  }

  const AUTO_SCAN_MS = 5 * 60 * 1000;
  let autoScanTimer = null;
  let autoScanRunning = false;

  async function executeBackgroundSearch(silent) {
    if (!isOwnerView() || autoScanRunning || typeof PAAutoPublisher === 'undefined') return null;
    autoScanRunning = true;
    let notify = null;
    if (!silent && typeof PACornerNotify !== 'undefined') {
      notify = PACornerNotify.show({
        title: 'IA buscando notícias',
        body: 'Varredura em andamento — sem interromper sua navegação.',
        icon: 'fa-spinner fa-spin',
        scanning: true,
        closable: false,
        actions: []
      });
    }
    try {
      const onProgress = e => {
        const d = e.detail;
        if (d && notify) {
          notify.update({ body: `Verificando fontes <strong>${d.current}/${d.total}</strong>…` });
        }
      };
      window.addEventListener('pa-deep-verify', onProgress);
      const result = await PAAutoPublisher.run(true);
      window.removeEventListener('pa-deep-verify', onProgress);
      notify?.dismiss();
      if (result?.published > 0) {
        await PAStore.init();
        applyArticles(PAStore.getArticles('pub'));
        if (typeof PACornerNotify !== 'undefined') {
          PACornerNotify.show({
            title: 'Novas notícias publicadas',
            body: `<strong>${result.published}</strong> matéria(s) verificada(s) e adicionada(s) ao portal.`,
            icon: 'fa-check-circle',
            duration: 8000,
            actions: [{ id: 'ok', label: 'Ok', kind: 'yes' }]
          });
        } else {
          showToast(`${result.published} notícia(s) publicada(s) pela IA`, 'success');
        }
      } else if (!silent && typeof PACornerNotify !== 'undefined') {
        PACornerNotify.show({
          title: 'Busca concluída',
          body: 'Nenhuma matéria nova no momento. Próxima verificação em <strong>5 min</strong>.',
          icon: 'fa-info-circle',
          duration: 6000,
          actions: [{ id: 'ok', label: 'Ok', kind: 'yes' }]
        });
      }
      return result;
    } catch {
      notify?.dismiss();
      return null;
    } finally {
      autoScanRunning = false;
    }
  }

  function promptAutoSearch() {
    if (!isOwnerView() || autoScanRunning) return;
    const pref = typeof PACornerNotify !== 'undefined' ? PACornerNotify.getAutoPref() : true;
    if (!pref) return;

    if (typeof PACornerNotify === 'undefined') {
      executeBackgroundSearch(true);
      return;
    }

    PACornerNotify.show({
      title: 'Busca automática',
      body: 'A IA pode verificar novas notícias de Pains e região. Deseja buscar agora?',
      icon: 'fa-satellite-dish',
      actions: [
        {
          id: 'yes',
          label: 'Sim, buscar',
          kind: 'yes',
          onClick: () => executeBackgroundSearch(false)
        },
        {
          id: 'no',
          label: 'Agora não',
          kind: 'no',
          onClick: () => {}
        },
        {
          id: 'off',
          label: 'Não perguntar',
          kind: 'no',
          onClick: () => PACornerNotify.setAutoPref(false)
        }
      ]
    });
  }

  function startAutoScanLoop() {
    if (!isOwnerView()) return;
    clearInterval(autoScanTimer);
    autoScanTimer = setInterval(promptAutoSearch, AUTO_SCAN_MS);
    setTimeout(promptAutoSearch, 12000);
  }

  function runBackgroundSearch() {
    if (!isOwnerView()) return;
    executeBackgroundSearch(false);
  }

  async function fetchPubFromJson() {
    try {
      const url = new URL('data/articles.json', new URL('./', location.href)).href;
      const res = await fetch(url + '?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.filter(a => a.status === 'pub') : [];
    } catch {
      return [];
    }
  }

  function mergePubLists(jsonList, extra) {
    const map = new Map((jsonList || []).map(a => [String(a.id), a]));
    (extra || []).forEach(a => {
      if (a && a.status === 'pub') map.set(String(a.id), a);
    });
    return [...map.values()].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  }

  async function init() {
    let raw = await fetchPubFromJson();
    const hasAuth = !!(sessionStorage.getItem('pa_auth_mode') || sessionStorage.getItem('pa_token'));
    if (hasAuth || isOwnerView()) {
      try {
        await PAStore.init({ admin: hasAuth });
        raw = mergePubLists(raw, PAStore.getArticles('pub'));
      } catch {}
    }
    if (!raw.length) {
      try { localStorage.removeItem('pa_articles_cache_v2'); } catch {}
    }
    applyArticles(raw, filterForDisplay(raw));

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

    if (typeof PAAds !== 'undefined') {
      PAAds.init(allPub).catch(() => {});
    }

    if (typeof PADirectory !== 'undefined') {
      PADirectory.init().then(() => observeReveals()).catch(() => {});
    }

    const search = document.getElementById('siteSearch');
    if (search) {
      search.addEventListener('keydown', async function (e) {
        if (e.key !== 'Enter') return;
        const q = this.value.trim();
        if (!q) return;
        const ql = q.toLowerCase();
        const matches = allPub.filter(a =>
          a.title.toLowerCase().includes(ql) || a.cat.toLowerCase().includes(ql) || (a.lead || '').toLowerCase().includes(ql)
        );
        if (matches.length === 1) {
          location.href = 'pages/noticia.html?id=' + matches[0].id;
          return;
        }
        if (typeof PANewsIA !== 'undefined' && typeof PANewsWidget !== 'undefined') {
          applyNav('buscanoticias');
          const inp = document.getElementById('panewsInput');
          if (inp) inp.value = q;
          await PANewsWidget.runSearch(q);
          if (matches.length > 1) showToast(`${matches.length} no portal + busca IA regional`, 'success');
          return;
        }
        if (matches.length > 1) {
          applyNav('ultimas');
          showToast(`${matches.length} resultados para "${q}"`, 'success');
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

    startAutoScanLoop();

    if (isOwnerView()) {
      document.body.classList.add('pa-owner');
      if (typeof PADivulgacaoIA !== 'undefined') PADivulgacaoIA.init();
    }
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