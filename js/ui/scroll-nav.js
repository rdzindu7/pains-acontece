const PAScrollNav = (function () {
  let track, thumb, up, down, ticking;

  function inject() {
    if (document.getElementById('paScrollNav')) return;
    const el = document.createElement('div');
    el.id = 'paScrollNav';
    el.className = 'pa-scroll-nav';
    el.innerHTML = `
      <button class="pa-scroll-btn pa-scroll-up" aria-label="Subir"><i class="fas fa-chevron-up"></i></button>
      <div class="pa-scroll-track" aria-hidden="true">
        <div class="pa-scroll-thumb"></div>
      </div>
      <button class="pa-scroll-btn pa-scroll-down" aria-label="Descer"><i class="fas fa-chevron-down"></i></button>`;
    document.body.appendChild(el);
    track = el.querySelector('.pa-scroll-track');
    thumb = el.querySelector('.pa-scroll-thumb');
    up = el.querySelector('.pa-scroll-up');
    down = el.querySelector('.pa-scroll-down');

    up.addEventListener('click', () => window.scrollBy({ top: -window.innerHeight * 0.75, behavior: 'smooth' }));
    down.addEventListener('click', () => window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' }));
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? window.scrollY / max : 0;
      const trackH = track?.offsetHeight || 200;
      const thumbH = Math.max(36, trackH * (window.innerHeight / doc.scrollHeight));
      if (thumb) {
        thumb.style.height = thumbH + 'px';
        thumb.style.transform = `translateY(${(trackH - thumbH) * pct}px)`;
      }
      if (document.getElementById('paScrollNav')) {
        document.getElementById('paScrollNav').classList.toggle('visible', max > 120);
      }
      ticking = false;
    });
  }

  function init() {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    inject();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => PAScrollNav.init());