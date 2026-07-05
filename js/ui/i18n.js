const PATranslate = (function () {
  const LS = 'pa_lang_v1';
  const LANGS = {
    'pt-BR': { label: 'Português', flag: '🇧🇷', short: 'PT' },
    'en-US': { label: 'English', flag: '🇺🇸', short: 'EN' },
    'es-ES': { label: 'Español', flag: '🇪🇸', short: 'ES' }
  };

  const T = {
    'pt-BR': {
      'nav.home': 'Home', 'nav.ultimas': 'Últimas', 'nav.pains': 'Pains', 'nav.regiao': 'Região',
      'nav.brasil': 'Brasil/Mundo', 'nav.policia': 'Polícia', 'nav.politica': 'Política', 'nav.saude': 'Saúde',
      'nav.agenda': 'Agenda', 'nav.empregos': 'Empregos', 'nav.restaurantes': 'Restaurantes', 'nav.telefones': 'Telefones',
      'nav.clima': 'Clima', 'nav.anuncie': 'Anuncie', 'nav.pauta': 'Pauta',
      'search.placeholder': 'Buscar notícias, serviços, restaurantes…',
      'ticker.live': 'AO VIVO', 'admin': 'Admin', 'lang.choose': 'Idioma',
      'sec.ultimas': 'Últimas Notícias', 'sec.ver_todas': 'Ver todas',
      'ads.title': 'Anuncie no', 'ads.sub': 'Alcance moradores de Pains e toda a região do Alto São Francisco.',
      'ads.cta': 'Solicitar Orçamento', 'ads.note': 'Valores sujeitos a negociação para contratos trimestrais ou anuais.',
      'pauta.title': 'Envie sua Pauta', 'pauta.sub': 'Você tem uma denúncia, sugestão ou informação importante? Fale com a nossa redação.',
      'pauta.send': 'Enviar Pauta', 'footer.rights': 'Todos os direitos reservados.',
      'footer.made': 'Feito com', 'footer.for': 'para Pains e região',
      'hero.loading': 'Carregando manchete…', 'empty.section': 'Nenhuma notícia nesta seção no momento. Volte em breve!'
    },
    'en-US': {
      'nav.home': 'Home', 'nav.ultimas': 'Latest', 'nav.pains': 'Pains', 'nav.regiao': 'Region',
      'nav.brasil': 'Brazil/World', 'nav.policia': 'Police', 'nav.politica': 'Politics', 'nav.saude': 'Health',
      'nav.agenda': 'Events', 'nav.empregos': 'Jobs', 'nav.restaurantes': 'Restaurants', 'nav.telefones': 'Phones',
      'nav.clima': 'Weather', 'nav.anuncie': 'Advertise', 'nav.pauta': 'Tip Line',
      'search.placeholder': 'Search news, services, restaurants…',
      'ticker.live': 'LIVE', 'admin': 'Admin', 'lang.choose': 'Language',
      'sec.ultimas': 'Latest News', 'sec.ver_todas': 'View all',
      'ads.title': 'Advertise on', 'ads.sub': 'Reach residents of Pains and the entire Alto São Francisco region.',
      'ads.cta': 'Request a Quote', 'ads.note': 'Prices negotiable for quarterly or annual contracts.',
      'pauta.title': 'Send Your Tip', 'pauta.sub': 'Have a report, suggestion or important information? Contact our newsroom.',
      'pauta.send': 'Send Tip', 'footer.rights': 'All rights reserved.',
      'footer.made': 'Made with', 'footer.for': 'for Pains and region',
      'hero.loading': 'Loading headline…', 'empty.section': 'No news in this section yet. Check back soon!'
    },
    'es-ES': {
      'nav.home': 'Inicio', 'nav.ultimas': 'Últimas', 'nav.pains': 'Pains', 'nav.regiao': 'Región',
      'nav.brasil': 'Brasil/Mundo', 'nav.policia': 'Policía', 'nav.politica': 'Política', 'nav.saude': 'Salud',
      'nav.agenda': 'Agenda', 'nav.empregos': 'Empleos', 'nav.restaurantes': 'Restaurantes', 'nav.telefones': 'Teléfonos',
      'nav.clima': 'Clima', 'nav.anuncie': 'Anuncie', 'nav.pauta': 'Sugerencia',
      'search.placeholder': 'Buscar noticias, servicios, restaurantes…',
      'ticker.live': 'EN VIVO', 'admin': 'Admin', 'lang.choose': 'Idioma',
      'sec.ultimas': 'Últimas Noticias', 'sec.ver_todas': 'Ver todas',
      'ads.title': 'Anuncie en', 'ads.sub': 'Llegue a los habitantes de Pains y toda la región del Alto São Francisco.',
      'ads.cta': 'Solicitar Presupuesto', 'ads.note': 'Precios negociables para contratos trimestrales o anuales.',
      'pauta.title': 'Envíe su Sugerencia', 'pauta.sub': '¿Tiene una denuncia, sugerencia o información importante? Hable con nuestra redacción.',
      'pauta.send': 'Enviar', 'footer.rights': 'Todos los derechos reservados.',
      'footer.made': 'Hecho con', 'footer.for': 'para Pains y región',
      'hero.loading': 'Cargando titular…', 'empty.section': 'No hay noticias en esta sección. ¡Vuelva pronto!'
    }
  };

  let current = localStorage.getItem(LS) || 'pt-BR';
  if (!T[current]) current = 'pt-BR';

  function getLang() { return current; }

  function t(key) {
    return T[current]?.[key] || T['pt-BR'][key] || key;
  }

  function apply() {
    document.documentElement.lang = current === 'en-US' ? 'en' : current === 'es-ES' ? 'es' : 'pt-BR';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
      else el.textContent = val;
    });
    const btn = document.getElementById('langBtnLabel');
    if (btn) btn.textContent = LANGS[current]?.short || 'PT';
    document.querySelectorAll('.lang-opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === current);
    });
    if (typeof window.PAHomeRefresh === 'function') window.PAHomeRefresh();
  }

  function setLang(code) {
    if (!T[code]) return;
    current = code;
    localStorage.setItem(LS, code);
    apply();
    document.getElementById('langMenu')?.classList.remove('open');
  }

  function toggleMenu() {
    document.getElementById('langMenu')?.classList.toggle('open');
  }

  function injectPicker() {
    if (document.getElementById('langPicker')) return;
    const wrap = document.createElement('div');
    wrap.className = 'lang-picker';
    wrap.id = 'langPicker';
    wrap.innerHTML = `
      <button type="button" class="lang-btn" onclick="PATranslate.toggleMenu()" title="${t('lang.choose')}">
        <i class="fas fa-globe"></i> <span id="langBtnLabel">${LANGS[current].short}</span>
      </button>
      <div class="lang-menu" id="langMenu">
        ${Object.entries(LANGS).map(([code, l]) =>
          `<button type="button" class="lang-opt${code === current ? ' active' : ''}" data-lang="${code}" onclick="PATranslate.setLang('${code}')">${l.flag} ${l.label}</button>`
        ).join('')}
      </div>`;
    const header = document.querySelector('.header-right');
    if (header) header.insertBefore(wrap, header.firstChild);
    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) document.getElementById('langMenu')?.classList.remove('open');
    });
  }

  function init() {
    injectPicker();
    apply();
  }

  return { init, setLang, toggleMenu, t, getLang, apply };
})();

document.addEventListener('DOMContentLoaded', () => PATranslate.init());