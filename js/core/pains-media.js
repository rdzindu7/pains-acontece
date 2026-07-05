/** Imagens e mídia de Pains MG — fallbacks locais e regionais */
const PAPainsMedia = (function () {
  const ROOT = (function () {
    const p = location.pathname;
    return p.includes('/pages/') ? '../assets/images/' : 'assets/images/';
  })();

  const WIKI = {
    igreja: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Igreja_Nossa_Senhora_do_Ros%C3%A1rio_-_Pains_MG.jpg/1280px-Igreja_Nossa_Senhora_do_Ros%C3%A1rio_-_Pains_MG.jpg',
    pedreiras: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Pedreiras_de_Pains_-_MG.JPG/1280px-Pedreiras_de_Pains_-_MG.JPG'
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