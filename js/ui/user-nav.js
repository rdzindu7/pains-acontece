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
      .pa-user-btn--login{background:#fff!important;color:#3c4043!important;border-color:rgba(255,255,255,.2)!important}
      .pa-user-btn--login:hover{background:#f8f9fa!important;color:#1a1a1a!important;box-shadow:0 4px 14px rgba(0,0,0,.25)}
      .pa-google-g-sm{width:16px;height:16px;flex-shrink:0;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%23EA4335' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'/%3E%3Cpath fill='%234285F4' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'/%3E%3Cpath fill='%23FBBC05' d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'/%3E%3Cpath fill='%2334A853' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'/%3E%3C/svg%3E") center/contain no-repeat}
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
    try {
      await Promise.race([
        PASocial.init(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
    } catch (e) {
      console.warn('[PAUserNav] init', e);
    }

    const user = PASocial.getUser();
    const prof = PASocial.getProfile();
    const inPages = location.pathname.includes('/pages/');
    const base = inPages ? '' : 'pages/';

    if (!user) {
      el.innerHTML = `<a href="${base}entrar.html" class="pa-user-btn pa-user-btn--login" title="Entrar"><span class="pa-google-g-sm"></span> <span class="name">Entrar</span></a>`;
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