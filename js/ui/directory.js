const PADirectory = (function () {
  let services = [];
  let restaurants = [];

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function telHref(phone) {
    const digits = (phone || '').replace(/\D/g, '');
    return digits ? `tel:+55${digits}` : '#';
  }

  function injectStyles() {
    if (document.getElementById('padir-styles')) return;
    const s = document.createElement('style');
    s.id = 'padir-styles';
    s.textContent = `
      .guia-local{background:linear-gradient(180deg,transparent,rgba(13,77,13,.04) 40%,transparent);padding-bottom:clamp(32px,5vw,56px)}
      .guia-local .section{padding-top:clamp(28px,4vw,48px)!important;padding-bottom:clamp(20px,3vw,36px)!important}
      .srv-scroll{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,168px),1fr));gap:clamp(10px,2vw,14px)}
      @media(min-width:900px){.srv-scroll{grid-template-columns:repeat(4,1fr)}}
      .srv-card-v2{
        display:flex;flex-direction:column;border-radius:10px;overflow:hidden;
        background:var(--k3,#1a1a1a);border:1px solid rgba(255,255,255,.06);
        transition:transform .35s var(--ease,cubic-bezier(.16,1,.3,1)),box-shadow .35s,border-color .35s;
        text-decoration:none;color:inherit;position:relative;min-height:100%;
      }
      .srv-card-v2:hover{transform:translateY(-4px);border-color:rgba(29,122,29,.45);box-shadow:0 12px 36px rgba(0,0,0,.45)}
      .srv-card-v2 .srv-img{height:100px;overflow:hidden;position:relative}
      .srv-card-v2 .srv-img img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
      .srv-card-v2:hover .srv-img img{transform:scale(1.06)}
      .srv-card-v2 .srv-img::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(8,8,8,.85),transparent 60%)}
      .srv-card-v2 .srv-ic{position:absolute;bottom:8px;left:10px;width:32px;height:32px;border-radius:8px;background:rgba(29,122,29,.85);display:flex;align-items:center;justify-content:center;color:var(--y,#c9a227);font-size:.85rem;z-index:1}
      .srv-card-v2 .srv-body{padding:12px 14px 14px;flex:1;display:flex;flex-direction:column}
      .srv-card-v2 h4{font-size:.76rem;font-weight:700;line-height:1.3;margin-bottom:4px}
      .srv-card-v2 p{font-size:.64rem;color:var(--dim,#555);line-height:1.45;flex:1}
      .srv-card-v2 .srv-phone{font-size:.62rem;color:var(--g3,#2ecc2e);margin-top:8px;font-weight:700}
      .rest-showcase{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:clamp(12px,2.5vw,18px)}
      .rest-card-v2{
        border-radius:12px;overflow:hidden;background:var(--k3,#1a1a1a);
        border:1px solid rgba(255,255,255,.06);cursor:pointer;
        transition:transform .35s var(--ease),box-shadow .35s,border-color .35s;
        display:flex;flex-direction:column;
      }
      .rest-card-v2:hover{transform:translateY(-5px);border-color:rgba(201,162,39,.4);box-shadow:0 16px 40px rgba(0,0,0,.5)}
      .rest-card-v2 .rest-img{height:160px;position:relative;overflow:hidden}
      .rest-card-v2 .rest-img img{width:100%;height:100%;object-fit:cover;transition:transform .6s}
      .rest-card-v2:hover .rest-img img{transform:scale(1.05)}
      .rest-card-v2 .rest-img::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(8,8,8,.9),transparent 50%)}
      .rest-card-v2 .rest-badge{position:absolute;top:10px;left:10px;padding:4px 10px;border-radius:20px;font-size:.55rem;font-weight:800;letter-spacing:.8px;text-transform:uppercase;background:rgba(201,162,39,.2);color:var(--y,#c9a227);border:1px solid rgba(201,162,39,.35);z-index:1}
      .rest-card-v2 .rest-type-pill{position:absolute;bottom:10px;left:10px;font-size:.6rem;font-weight:700;color:#fff;background:rgba(0,0,0,.55);padding:4px 10px;border-radius:4px;z-index:1}
      .rest-card-v2 .rest-body{padding:16px 18px 18px;flex:1;display:flex;flex-direction:column}
      .rest-card-v2 .rest-name{font-size:.92rem;font-weight:700;margin-bottom:4px}
      .rest-card-v2 .rest-loc{font-size:.68rem;color:var(--dim);margin-bottom:10px}
      .rest-card-v2 .rest-desc{font-size:.72rem;color:rgba(255,255,255,.5);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px;flex:1}
      .rest-card-v2 .rest-actions{display:flex;gap:8px;flex-wrap:wrap}
      .rest-card-v2 .rest-btn{font-size:.62rem;font-weight:700;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--w);display:inline-flex;align-items:center;gap:6px;transition:all .25s;text-decoration:none}
      .rest-card-v2 .rest-btn:hover{background:rgba(29,122,29,.2);border-color:rgba(29,122,29,.4);color:var(--g3)}
      .rest-card-v2 .rest-btn.gold{border-color:rgba(201,162,39,.35);color:var(--y)}
      .rest-card-v2.rest-add-v2{border:2px dashed rgba(29,122,29,.35);background:rgba(29,122,29,.04);min-height:280px;align-items:center;justify-content:center;text-align:center;padding:24px}
      .rest-card-v2.rest-add-v2 .rest-img{display:none}
      .rest-card-v2.rest-add-v2 i{font-size:2.2rem;color:var(--g3);margin-bottom:12px}
      .rest-card-v2.rest-add-v2 .rest-name{color:var(--g3)}
      .padir-modal{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.75);opacity:0;pointer-events:none;transition:opacity .3s}
      .padir-modal.open{opacity:1;pointer-events:all}
      .padir-modal-box{background:var(--k2,#111);border:1px solid rgba(255,255,255,.08);border-radius:12px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;transform:scale(.95);transition:transform .35s var(--ease)}
      .padir-modal.open .padir-modal-box{transform:none}
      .padir-modal-img{height:200px;overflow:hidden}
      .padir-modal-img img{width:100%;height:100%;object-fit:cover}
      .padir-modal-body{padding:24px}
      .padir-modal-body h3{font-family:var(--ff-serif,'Playfair Display',serif);font-size:1.4rem;margin-bottom:8px}
      .padir-modal-body .padir-type{color:var(--y);font-size:.72rem;font-weight:700;margin-bottom:12px}
      .padir-modal-body p{font-size:.85rem;color:rgba(255,255,255,.65);line-height:1.7;margin-bottom:16px}
      .padir-modal-menu{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:.8rem;line-height:1.6;white-space:pre-wrap;color:rgba(255,255,255,.75)}
      .padir-modal-ft{padding:16px 24px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:10px;flex-wrap:wrap}
      .padir-modal-ft a,.padir-modal-ft button{flex:1;min-width:120px;padding:12px 16px;border-radius:8px;font-size:.72rem;font-weight:700;text-align:center;text-decoration:none;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}
      .padir-modal-ft .btn-call{background:linear-gradient(135deg,#1d7a1d,#0d4d0d);color:#fff}
      .padir-modal-ft .btn-close{background:rgba(255,255,255,.06);color:var(--w)}
      .guia-strip{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
      .guia-strip::-webkit-scrollbar{height:4px}
      .guia-strip .srv-card-v2{min-width:150px;flex:0 0 150px}
      @media(max-width:600px){
        .rest-card-v2 .rest-img{height:140px}
        .srv-card-v2 .srv-img{height:88px}
      }
    `;
    document.head.appendChild(s);
  }

  function ensureModal() {
    if (document.getElementById('padirModal')) return;
    const m = document.createElement('div');
    m.className = 'padir-modal';
    m.id = 'padirModal';
    m.innerHTML = '<div class="padir-modal-box" id="padirModalBox"></div>';
    m.addEventListener('click', e => { if (e.target === m) closeModal(); });
    document.body.appendChild(m);
  }

  function closeModal() {
    document.getElementById('padirModal')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openRestaurantModal(item) {
    ensureModal();
    const box = document.getElementById('padirModalBox');
    const phone = item.phone || '';
    const menuBlock = item.menu
      ? (item.menu.startsWith('http')
        ? `<a href="${esc(item.menu)}" target="_blank" rel="noopener" class="rest-btn gold" style="display:inline-flex;margin-bottom:12px"><i class="fas fa-utensils"></i> Ver cardápio / catálogo</a>`
        : `<div class="padir-modal-menu"><strong style="color:var(--y);display:block;margin-bottom:8px"><i class="fas fa-utensils"></i> Cardápio</strong>${esc(item.menu)}</div>`)
      : '';
    box.innerHTML = `
      ${item.image ? `<div class="padir-modal-img"><img src="${esc(item.image)}" alt="${esc(item.name)}"/></div>` : ''}
      <div class="padir-modal-body">
        ${item.sponsored ? '<span class="rest-badge" style="position:static;display:inline-block;margin-bottom:10px">Parceiro</span>' : ''}
        <h3>${esc(item.name)}</h3>
        <div class="padir-type">${esc(item.type)} · ${esc(item.location || 'Pains, MG')}</div>
        <p>${esc(item.description || '')}</p>
        ${menuBlock}
      </div>
      <div class="padir-modal-ft">
        ${phone ? `<a class="btn-call" href="${telHref(phone)}"><i class="fas fa-phone-alt"></i> ${esc(phone)}</a>` : ''}
        <button type="button" class="btn-close" onclick="PADirectory.closeModal()"><i class="fas fa-times"></i> Fechar</button>
      </div>`;
    document.getElementById('padirModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function serviceCard(s, compact) {
    const href = s.link && s.link !== '#' ? s.link : telHref(s.phone);
    const ext = href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${esc(href)}"${ext} class="srv-card-v2 reveal">
      <div class="srv-img">
        <img src="${esc(s.image)}" alt="${esc(s.title)}" loading="lazy" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Igreja_Nossa_Senhora_do_Ros%C3%A1rio_-_Pains_MG.jpg/320px-Igreja_Nossa_Senhora_do_Ros%C3%A1rio_-_Pains_MG.jpg'"/>
        <span class="srv-ic"><i class="fas ${esc(s.icon || 'fa-building')}"></i></span>
      </div>
      <div class="srv-body">
        <h4>${esc(s.title)}</h4>
        <p>${esc(s.description)}</p>
        ${s.phone ? `<span class="srv-phone"><i class="fas fa-phone-alt"></i> ${esc(s.phone)}</span>` : ''}
      </div>
    </a>`;
  }

  function restaurantCard(r) {
    const phone = r.phone || '';
    return `<article class="rest-card-v2 reveal" data-id="${r.id}" onclick="PADirectory.openRestaurant(${r.id})">
      <div class="rest-img">
        <img src="${esc(r.image)}" alt="${esc(r.name)}" loading="lazy"/>
        ${r.sponsored ? '<span class="rest-badge">Parceiro</span>' : ''}
        <span class="rest-type-pill">${esc(r.type)}</span>
      </div>
      <div class="rest-body">
        <div class="rest-name">${esc(r.name)}</div>
        <div class="rest-loc"><i class="fas fa-map-marker-alt"></i> ${esc(r.location || 'Pains, MG')}</div>
        <p class="rest-desc">${esc(r.description)}</p>
        <div class="rest-actions" onclick="event.stopPropagation()">
          <button type="button" class="rest-btn gold" onclick="PADirectory.openRestaurant(${r.id})"><i class="fas fa-info-circle"></i> Detalhes</button>
          ${phone ? `<a class="rest-btn" href="${telHref(phone)}"><i class="fas fa-phone-alt"></i> Ligar</a>` : ''}
          ${r.menu && r.menu.startsWith('http') ? `<a class="rest-btn" href="${esc(r.menu)}" target="_blank" rel="noopener"><i class="fas fa-utensils"></i> Cardápio</a>` : ''}
        </div>
      </div>
    </article>`;
  }

  function addRestaurantCard() {
    return `<a href="#publicidades" class="rest-card-v2 rest-add-v2 reveal" onclick="event.preventDefault();document.getElementById('publicidades')?.scrollIntoView({behavior:'smooth'})">
      <div class="rest-body" style="align-items:center;padding:0">
        <i class="fas fa-plus-circle"></i>
        <div class="rest-name">Cadastre seu estabelecimento</div>
        <div class="rest-loc" style="color:var(--g3)">Anuncie no Pains Acontece</div>
      </div>
    </a>`;
  }

  function renderServices(targetId, compact) {
    injectStyles();
    const el = document.getElementById(targetId || 'servicesDynamic');
    if (!el) return;
    const list = services.filter(s => s.active !== false);
    if (!list.length) {
      el.innerHTML = '<p style="color:var(--dim);font-size:.82rem">Serviços em atualização.</p>';
      return;
    }
    const cls = compact ? 'guia-strip' : 'srv-scroll';
    el.className = cls;
    el.innerHTML = list.map(s => serviceCard(s, compact)).join('');
  }

  function renderRestaurants(targetId) {
    injectStyles();
    const el = document.getElementById(targetId || 'restaurantsDynamic');
    if (!el) return;
    const list = restaurants.filter(r => r.active !== false);
    el.className = 'rest-showcase';
    el.innerHTML = list.map(r => restaurantCard(r)).join('') + addRestaurantCard();
  }

  function openRestaurant(id) {
    const item = restaurants.find(r => String(r.id) === String(id));
    if (item) openRestaurantModal(item);
  }

  async function init() {
    injectStyles();
    ensureModal();
    try {
      [services, restaurants] = await Promise.all([
        PAAPI.getServices(),
        PAAPI.getRestaurants()
      ]);
    } catch {
      services = [];
      restaurants = [];
    }
    renderServices('servicesDynamic', false);
    renderServices('servicesCompact', true);
    renderRestaurants('restaurantsDynamic');
  }

  return { init, renderServices, renderRestaurants, openRestaurant, closeModal };
})();