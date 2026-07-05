const PAAds = (function () {
  const FOUNDER_SLOTS = ['banner', 'sidebar', 'editorial', 'ticker', 'social'];
  let ads = [];

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function expired(ad) {
    if (!ad?.expires) return false;
    return new Date(ad.expires).getTime() < Date.now();
  }

  function injectStyles() {
    if (document.getElementById('paads-styles')) return;
    const s = document.createElement('style');
    s.id = 'paads-styles';
    s.textContent = `
      .pa-ad-banner{margin:0 auto;max-width:var(--container-max,1400px);padding:0 var(--pad-x,16px);animation:paAdIn .6s var(--ease,cubic-bezier(.16,1,.3,1))}
      .pa-ad-banner-inner{position:relative;border-radius:8px;overflow:hidden;border:1px solid rgba(201,162,39,.25);background:linear-gradient(135deg,#111,#0a0a0a);display:block;transition:transform .35s,box-shadow .35s}
      .pa-ad-banner-inner:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(29,122,29,.2)}
      .pa-ad-banner img{width:100%;height:clamp(120px,18vw,200px);object-fit:cover;opacity:.85}
      .pa-ad-banner-overlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,8,8,.92) 0%,rgba(8,8,8,.4) 55%,transparent);display:flex;align-items:center;padding:clamp(16px,3vw,32px);gap:20px}
      .pa-ad-banner-text{flex:1;min-width:0}
      .pa-ad-banner-text h3{font-family:var(--ff-display,'Bebas Neue',sans-serif);letter-spacing:1.5px;font-size:clamp(1.1rem,2.5vw,1.6rem);margin-bottom:6px}
      .pa-ad-banner-text p{font-size:.78rem;color:rgba(255,255,255,.55);line-height:1.5}
      .pa-ad-cta{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:linear-gradient(135deg,#1d7a1d,#0d4d0d);border-radius:4px;font-size:.68rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;flex-shrink:0;transition:background .25s}
      .pa-ad-banner-inner:hover .pa-ad-cta{background:linear-gradient(135deg,#2ecc2e,#1d7a1d)}
      .pa-ad-label{font-size:.55rem;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--y,#c9a227);margin-bottom:8px;display:flex;align-items:center;gap:6px}
      .pa-ad-label::before{content:'';width:14px;height:2px;background:var(--y,#c9a227)}
      .pa-ad-sidebar{display:block;border-radius:6px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:var(--k3,#1a1a1a);transition:border-color .3s,transform .3s;animation:paAdIn .5s ease}
      .pa-ad-sidebar:hover{border-color:rgba(201,162,39,.4);transform:translateY(-3px)}
      .pa-ad-sidebar img{width:100%;height:140px;object-fit:cover}
      .pa-ad-sidebar-body{padding:14px 16px}
      .pa-ad-sidebar h4{font-size:.82rem;font-weight:700;margin-bottom:6px;line-height:1.35}
      .pa-ad-sidebar p{font-size:.72rem;color:var(--dim,#555);line-height:1.5;margin-bottom:10px}
      .pa-ad-sidebar .pa-ad-cta{padding:8px 14px;font-size:.6rem;width:100%;justify-content:center}
      .pa-ad-editorial{grid-column:1/-1;margin-bottom:8px;animation:paAdIn .6s ease}
      .pa-ad-editorial-inner{display:grid;grid-template-columns:1fr 1.4fr;gap:0;border-radius:6px;overflow:hidden;border:1px solid rgba(201,162,39,.3);background:linear-gradient(135deg,rgba(201,162,39,.06),rgba(8,8,8,.9));transition:box-shadow .35s}
      .pa-ad-editorial-inner:hover{box-shadow:0 8px 32px rgba(201,162,39,.15)}
      .pa-ad-editorial img{width:100%;height:100%;min-height:180px;object-fit:cover}
      .pa-ad-editorial-body{padding:24px 28px;display:flex;flex-direction:column;justify-content:center}
      .pa-ad-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:.58rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;background:rgba(201,162,39,.15);color:var(--y,#c9a227);margin-bottom:12px;width:fit-content}
      .pa-ad-editorial h3{font-family:var(--ff-serif,'Playfair Display',serif);font-size:1.35rem;line-height:1.3;margin-bottom:10px}
      .pa-ad-ticker-ad{color:var(--y,#f0d060)!important;font-weight:700}
      .pa-ad-ticker-ad::before{color:var(--y)!important}
      .pa-ad-newsletter{padding:18px;border-radius:6px;border:1px solid rgba(29,122,29,.25);background:linear-gradient(135deg,rgba(29,122,29,.08),rgba(8,8,8,.6));animation:paAdIn .5s ease}
      .pa-ad-newsletter h4{font-family:var(--ff-display);letter-spacing:1.5px;font-size:1rem;margin-bottom:8px;color:var(--g3,#2ecc2e)}
      .pa-ad-newsletter p{font-size:.75rem;color:var(--dim);line-height:1.55;margin-bottom:14px}
      .pa-ad-social{display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);transition:all .3s;animation:paAdIn .5s ease}
      .pa-ad-social:hover{border-color:rgba(29,122,29,.4);background:rgba(29,122,29,.08)}
      .pa-ad-social-ic{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1d7a1d,#0d4d0d);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
      .pa-ad-social-text{flex:1;min-width:0}
      .pa-ad-social-text strong{display:block;font-size:.78rem;margin-bottom:2px}
      .pa-ad-social-text span{font-size:.68rem;color:var(--dim)}
      @keyframes paAdIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      @keyframes paAdPulse{0%,100%{box-shadow:0 0 0 0 rgba(201,162,39,0)}50%{box-shadow:0 0 20px 2px rgba(201,162,39,.12)}}
      .pa-ad-banner-inner{animation:paAdPulse 4s ease infinite}
      @media(max-width:768px){
        .pa-ad-banner-overlay{flex-direction:column;align-items:flex-start;background:linear-gradient(to top,rgba(8,8,8,.95),rgba(8,8,8,.5))}
        .pa-ad-editorial-inner{grid-template-columns:1fr}
        .pa-ad-editorial img{min-height:140px}
      }
    `;
    document.head.appendChild(s);
  }

  function getForSlot(slot) {
    const founder = ads.find(a => a.slot === 'founder' && a.active && !expired(a));
    if (founder && FOUNDER_SLOTS.includes(slot)) return founder;
    return ads.find(a => a.slot === slot && a.active && !expired(a)) || null;
  }

  function linkHref(url) {
    if (!url) return '#';
    if (url.startsWith('#') || url.startsWith('http') || url.startsWith('mailto') || url.startsWith('tel')) return url;
    return url;
  }

  function trackClick(ad) {
    if (!ad?.id) return;
    try {
      const key = 'pa_ad_clicks';
      const clicks = JSON.parse(localStorage.getItem(key) || '{}');
      clicks[ad.id] = (clicks[ad.id] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(clicks));
    } catch {}
  }

  function renderBanner() {
    const el = document.getElementById('adBannerSlot');
    const ad = getForSlot('banner');
    if (!el || !ad) { if (el) el.innerHTML = ''; return; }
    el.innerHTML = `
      <div class="pa-ad-banner reveal">
        <a class="pa-ad-banner-inner" href="${esc(linkHref(ad.link))}" target="_blank" rel="noopener sponsored" onclick="PAAds.track(${ad.id})">
          ${ad.image ? `<img src="${esc(ad.image)}" alt="${esc(ad.title)}" loading="lazy"/>` : ''}
          <div class="pa-ad-banner-overlay">
            <div class="pa-ad-banner-text">
              <div class="pa-ad-label">Publicidade · ${esc(ad.advertiser)}</div>
              <h3>${esc(ad.title)}</h3>
              <p>${esc(ad.text)}</p>
            </div>
            ${ad.cta ? `<span class="pa-ad-cta">${esc(ad.cta)} <i class="fas fa-arrow-right"></i></span>` : ''}
          </div>
        </a>
      </div>`;
  }

  function renderSidebar(targetId) {
    const el = document.getElementById(targetId || 'adSidebarSlot');
    const ad = getForSlot('sidebar');
    if (!el) return;
    if (!ad) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <div class="widget reveal pa-ad-widget">
        <div class="wid-head"><i class="fas fa-ad"></i><h3>Publicidade</h3></div>
        <div class="wid-body">
          <a class="pa-ad-sidebar" href="${esc(linkHref(ad.link))}" target="_blank" rel="noopener sponsored" onclick="PAAds.track(${ad.id})">
            ${ad.image ? `<img src="${esc(ad.image)}" alt="${esc(ad.title)}" loading="lazy"/>` : ''}
            <div class="pa-ad-sidebar-body">
              <h4>${esc(ad.title)}</h4>
              <p>${esc(ad.text)}</p>
              ${ad.cta ? `<span class="pa-ad-cta">${esc(ad.cta)} <i class="fas fa-external-link-alt"></i></span>` : ''}
            </div>
          </a>
        </div>
      </div>`;
  }

  function renderEditorial() {
    const el = document.getElementById('adEditorialSlot');
    const ad = getForSlot('editorial');
    if (!el || !ad) { if (el) el.innerHTML = ''; return; }
    el.innerHTML = `
      <a class="pa-ad-editorial" href="${esc(linkHref(ad.link))}" target="_blank" rel="noopener sponsored" onclick="PAAds.track(${ad.id})">
        <div class="pa-ad-editorial-inner reveal">
          ${ad.image ? `<img src="${esc(ad.image)}" alt="${esc(ad.title)}" loading="lazy"/>` : '<div style="background:#1a1a1a;min-height:180px"></div>'}
          <div class="pa-ad-editorial-body">
            <span class="pa-ad-badge"><i class="fas fa-star"></i> Conteúdo Patrocinado</span>
            <h3>${esc(ad.title)}</h3>
            <p style="font-size:.82rem;color:rgba(255,255,255,.55);line-height:1.6">${esc(ad.text)}</p>
            ${ad.cta ? `<span class="pa-ad-cta" style="width:fit-content;margin-top:12px">${esc(ad.cta)} <i class="fas fa-arrow-right"></i></span>` : ''}
          </div>
        </div>
      </a>`;
  }

  function renderTicker(newsItems) {
    const el = document.getElementById('tickerDynamic');
    const ad = getForSlot('ticker');
    if (!el) return;
    const adSpan = ad
      ? `<span class="pa-ad-ticker-ad"><a href="${esc(linkHref(ad.link))}" target="_blank" rel="sponsored" onclick="PAAds.track(${ad.id});return true">${esc(ad.text || ad.title)}</a></span>`
      : '';
    const newsSpans = (newsItems || []).slice(0, 8).map(t =>
      `<span>${esc(typeof t === 'string' ? t : t.title)}</span>`
    ).join('');
    const fallback = '<span>Pains Acontece — notícias de Pains e região</span>';
    el.innerHTML = (adSpan + newsSpans) || fallback;
    const lbl = document.querySelector('.ticker-lbl span[data-i18n="ticker.live"]');
    if (lbl && ad) lbl.textContent = 'PATROCINADO';
  }

  function renderNewsletter() {
    const el = document.getElementById('adNewsletterSlot');
    const ad = getForSlot('newsletter');
    if (!el) return;
    if (!ad) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <div class="widget reveal pa-ad-widget">
        <div class="wid-body pa-ad-newsletter">
          <h4><i class="fas fa-envelope"></i> ${esc(ad.title)}</h4>
          <p>${esc(ad.text)}</p>
          <a class="pa-ad-cta" href="${esc(linkHref(ad.link))}" style="width:100%;justify-content:center" onclick="PAAds.track(${ad.id})">${esc(ad.cta || 'Inscrever-se')}</a>
        </div>
      </div>`;
  }

  function renderSocial() {
    const el = document.getElementById('adSocialSlot');
    const ad = getForSlot('social');
    if (!el) return;
    if (!ad) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <a class="pa-ad-social" href="${esc(linkHref(ad.link))}" target="_blank" rel="noopener sponsored" onclick="PAAds.track(${ad.id})">
        <div class="pa-ad-social-ic"><i class="fab fa-instagram"></i></div>
        <div class="pa-ad-social-text">
          <strong>${esc(ad.title)}</strong>
          <span>${esc(ad.text)}</span>
        </div>
        <i class="fas fa-chevron-right" style="color:var(--dim);font-size:.7rem"></i>
      </a>`;
  }

  function renderAll(newsForTicker) {
    injectStyles();
    renderBanner();
    renderSidebar('adSidebarSlot');
    renderEditorial();
    renderNewsletter();
    renderSocial();
    renderTicker(newsForTicker);
  }

  async function init(newsForTicker) {
    try {
      ads = await PAAPI.getAds();
    } catch {
      ads = [];
    }
    renderAll(newsForTicker);
    return ads;
  }

  function getAds() { return ads; }

  return { init, renderAll, renderSidebar, renderTicker, track: trackClick, getForSlot, getAds };
})();