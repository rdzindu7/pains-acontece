/**
 * Botão Entrar / menu do usuário no header
 */
const PAUserNav = (function () {
  function injectStyles() {
    if (document.getElementById('pa-user-nav-styles')) return;
    const s = document.createElement('style');
    s.id = 'pa-user-nav-styles';
    s.textContent = `
      .pa-user-nav{position:relative;margin-left:4px}
      .pa-user-btn{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:rgba(255,255,255,.75);font-size:.68rem;font-weight:700;cursor:pointer;transition:all .2s;text-decoration:none;white-space:nowrap}
      .pa-user-btn:hover{border-color:rgba(29,122,29,.4);color:#2ecc2e}
      .pa-user-btn img,.pa-user-btn .pa-avatar{width:26px!important;height:26px!important;font-size:.65rem!important;line-height:26px!important}
      .pa-user-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:200px;background:#1a1a1a;border:1px solid rgba(29,122,29,.3);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.7);opacity:0;visibility:hidden;transform:translateY(-6px);transition:all .2s;z-index:500;overflow:hidden}
      .pa-user-menu.open{opacity:1;visibility:visible;transform:none}
      .pa-user-menu-head{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.06);font-size:.72rem}
      .pa-user-menu-head strong{display:block;color:#fff;font-size:.82rem;margin-bottom:2px}
      .pa-user-menu-head span{color:rgba(255,255,255,.4);font-size:.65rem}
      .pa-user-menu a,.pa-user-menu button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:10px 14px;border:none;background:none;color:rgba(255,255,255,.75);font-size:.75rem;cursor:pointer;text-decoration:none}
      .pa-user-menu a:hover,.pa-user-menu button:hover{background:rgba(29,122,29,.12);color:#fff}
      .pa-user-menu .logout{color:#e74c3c}
      .pa-user-menu .verified-link{color:#1d9bf0}
      @media(max-width:600px){.pa-user-btn span.name{display:none}}
    `;
    document.head.appendChild(s);
  }

  async function render(el) {
    if (!el) return;
    injectStyles();
    await PASocial.init();

    const user = PASocial.getUser();
    const prof = PASocial.getProfile();
    const inPages = location.pathname.includes('/pages/');
    const base = inPages ? '' : 'pages/';

    if (!user) {
      el.innerHTML = `<a href="${base}entrar.html" class="pa-user-btn" title="Entrar"><i class="fab fa-google"></i> <span class="name">Entrar</span></a>`;
      return;
    }

    const verified = PASocial.isVerified(prof);
    const name = PASocial.esc(prof?.display_name || user.name);
    el.innerHTML = `
      <button type="button" class="pa-user-btn" id="paUserMenuBtn" aria-haspopup="true">
        ${PASocial.avatarHtml(prof?.avatar_url, prof?.display_name, 26)}
        <span class="name">${name}</span>
        ${verified ? PASocial.verifiedBadgeHtml(true) : ''}
        <i class="fas fa-chevron-down" style="font-size:.55rem;opacity:.5"></i>
      </button>
      <div class="pa-user-menu" id="paUserMenu">
        <div class="pa-user-menu-head">
          <strong>${name} ${verified ? PASocial.verifiedBadgeHtml(true) : ''}</strong>
          <span>${PASocial.esc(user.email)}</span>
        </div>
        <a href="${base}conta.html"><i class="fas fa-user-edit"></i> Meu perfil</a>
        ${verified ? '' : `<a href="${base}verificado.html" class="verified-link"><i class="fas fa-check-circle"></i> Selo Verificado</a>`}
        <button type="button" class="logout" id="paUserLogout"><i class="fas fa-sign-out-alt"></i> Sair</button>
      </div>`;

    const btn = el.querySelector('#paUserMenuBtn');
    const menu = el.querySelector('#paUserMenu');
    btn?.addEventListener('click', e => {
      e.stopPropagation();
      menu?.classList.toggle('open');
    });
    document.addEventListener('click', () => menu?.classList.remove('open'));
    el.querySelector('#paUserLogout')?.addEventListener('click', async () => {
      await PASocial.signOut();
      render(el);
    });
  }

  function init(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    render(el);
    PASocial.onChange(() => render(el));
  }

  return { init, render };
})();