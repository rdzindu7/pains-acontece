/** Imagens e mídia de Pains MG — fallbacks locais e regionais */
const PAPainsMedia = (function () {
  const ROOT = (function () {
    const p = location.pathname;
    return p.includes('/pages/') ? '../assets/images/' : 'assets/images/';
  })();

  const WIKI = {
    igreja: ROOT + 'pains-acontece-logo.png',
    pedreiras: ROOT + 'pains-acontece-logo.png'
  };

  const LOCAL = {
    logo: ROOT + 'pains-acontece-logo.png',
    favicon: ROOT + 'favicon.jpg',
    igreja: WIKI.igreja,
    pedreiras: WIKI.pedreiras,
    paisagem: WIKI.pedreiras
  };

  const BY_CAT = {
    'Pains': WIKI.igreja,
    'Região': WIKI.pedreiras,
    'Polícia': WIKI.pedreiras,
    'Política': WIKI.igreja,
    'Saúde': WIKI.pedreiras,
    'Agenda': WIKI.igreja,
    'Empregos': WIKI.pedreiras,
    'Brasil': WIKI.igreja,
    'Brasil / Mundo': WIKI.pedreiras,
    'Mundo': WIKI.pedreiras
  };

  const HERO_BG = WIKI.igreja;
  const AUTH_BG = WIKI.pedreiras;

  function pick(cat) {
    return BY_CAT[cat] || LOCAL.igreja;
  }

  function heroForArticle(art) {
    if (art?.video) return { video: art.video, img: art.img || pick(art?.cat) };
    if (art?.img) return { img: art.img };
    return { img: pick(art?.cat) };
  }

  function imgFallback(cat) {
    const url = pick(cat);
    return ` onerror="this.onerror=null;this.src='${url}'"`;
  }

  function onerrorAttr(cat) {
    return imgFallback(cat);
  }

  return {
    LOCAL, WIKI, BY_CAT, HERO_BG, AUTH_BG,
    pick, heroForArticle, imgFallback, onerrorAttr, logo: () => LOCAL.logo
  };
})();