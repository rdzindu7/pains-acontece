/**
 * Widget de reações e comentários nas matérias
 */
const PASocialWidget = (function () {
  let articleId = null;
  let mounted = false;

  function injectStyles() {
    if (document.getElementById('pa-social-styles')) return;
    const s = document.createElement('style');
    s.id = 'pa-social-styles';
    s.textContent = `
      .pa-social{margin-top:40px;padding-top:32px;border-top:1px solid rgba(255,255,255,.08)}
      .pa-social h3{font-family:'Bebas Neue',sans-serif;letter-spacing:2px;color:#c9a227;font-size:1.1rem;margin-bottom:18px;display:flex;align-items:center;gap:10px}
      .pa-reactions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
      .pa-react-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:24px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:rgba(255,255,255,.6);font-size:.75rem;font-weight:600;cursor:pointer;transition:all .2s}
      .pa-react-btn:hover{border-color:rgba(29,122,29,.4);color:#2ecc2e}
      .pa-react-btn.active{background:rgba(29,122,29,.2);border-color:#1d7a1d;color:#fff}
      .pa-react-btn .cnt{opacity:.7;font-size:.68rem}
      .pa-react-total{font-size:.72rem;color:rgba(255,255,255,.35);margin-bottom:20px}
      .pa-comment-form{display:flex;gap:10px;margin-bottom:24px;align-items:flex-start}
      .pa-comment-form textarea{flex:1;min-height:72px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:12px 14px;color:#fff;font-family:inherit;font-size:.82rem;resize:vertical;outline:none}
      .pa-comment-form textarea:focus{border-color:#1d7a1d}
      .pa-comment-form button{padding:10px 18px;border-radius:8px;border:none;background:#1d7a1d;color:#fff;font-weight:700;font-size:.72rem;cursor:pointer;white-space:nowrap}
      .pa-comment-form button:disabled{opacity:.5;cursor:not-allowed}
      .pa-login-prompt{padding:22px;border-radius:12px;background:linear-gradient(135deg,rgba(29,122,29,.1),rgba(8,8,8,.4));border:1px solid rgba(29,122,29,.28);text-align:center;margin-bottom:22px}
      .pa-login-prompt p{font-size:.82rem;color:rgba(255,255,255,.55);line-height:1.5}
      .pa-login-prompt .pa-google-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;margin-top:14px;padding:11px 22px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#fff;color:#3c4043;font-weight:600;font-size:.82rem;cursor:pointer;text-decoration:none;transition:transform .2s,box-shadow .2s;box-shadow:0 2px 8px rgba(0,0,0,.2)}
      .pa-login-prompt .pa-google-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.35)}
      .pa-login-prompt .pa-google-g{width:18px;height:18px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='%23EA4335' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'/%3E%3Cpath fill='%234285F4' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'/%3E%3Cpath fill='%23FBBC05' d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'/%3E%3Cpath fill='%2334A853' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'/%3E%3C/svg%3E") center/contain no-repeat}
      .pa-comments-list{display:flex;flex-direction:column;gap:14px}
      .pa-comment{display:flex;gap:12px;padding:14px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
      .pa-comment.verified{border-color:rgba(201,162,39,.35);background:rgba(201,162,39,.06);box-shadow:0 0 0 1px rgba(201,162,39,.08)}
      .pa-comment-body{flex:1;min-width:0}
      .pa-comment-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
      .pa-comment-name{font-weight:700;font-size:.82rem;color:#fff}
      .pa-comment-date{font-size:.65rem;color:rgba(255,255,255,.35)}
      .pa-comment-text{font-size:.82rem;line-height:1.55;color:rgba(255,255,255,.82);word-break:break-word}
      .pa-comment-del{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:.7rem;padding:4px}
      .pa-comment-del:hover{color:#b52a2a}
      .pa-avatar{border-radius:50%;object-fit:cover;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1d7a1d,#0d4d0d);font-weight:800;font-size:.85rem;color:#fff}
      .pa-avatar--letter{text-align:center}
      .pa-vbadge{color:#1d9bf0;display:inline-flex;align-items:center;font-size:.85rem}
      .pa-vbadge--sm{font-size:.72rem}
      .pa-social-empty{font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;padding:24px}
      .pa-social-err{font-size:.75rem;color:#e74c3c;margin-top:8px}
    `;
    document.head.appendChild(s);
  }

  function commentHtml(c) {
    const p = c.profiles || {};
    const verified = PASocial.isVerified(p);
    const uid = PASocial.getUser()?.id;
    const canDel = uid && c.user_id === uid;
    return `
      <div class="pa-comment${verified ? ' verified' : ''}" data-id="${c.id}">
        ${PASocial.avatarHtml(p.avatar_url, p.display_name, 40)}
        <div class="pa-comment-body">
          <div class="pa-comment-head">
            <span class="pa-comment-name">${PASocial.esc(p.display_name || 'Leitor')}</span>
            ${verified ? PASocial.verifiedBadgeHtml(true) : ''}
            <span class="pa-comment-date">${PASocial.formatDate(c.created_at)}</span>
            ${canDel ? `<button type="button" class="pa-comment-del" data-del="${c.id}" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
          </div>
          <p class="pa-comment-text">${PASocial.esc(c.body)}</p>
        </div>
      </div>`;
  }

  async function renderReactions(el) {
    const data = await PASocial.getReactions(articleId);
    el.innerHTML = PASocial.REACTIONS.map(r => {
      const active = data.mine === r ? ' active' : '';
      const cnt = data.counts[r] || 0;
      return `<button type="button" class="pa-react-btn${active}" data-react="${r}" title="${PASocial.REACTION_LABELS[r]}">
        <i class="fas ${PASocial.REACTION_ICONS[r]}"></i> ${PASocial.REACTION_LABELS[r]}
        ${cnt ? `<span class="cnt">${cnt}</span>` : ''}
      </button>`;
    }).join('');
    const totalEl = el.parentElement?.querySelector('.pa-react-total');
    if (totalEl) {
      totalEl.textContent = data.total
        ? `${data.total} reação${data.total !== 1 ? 'ões' : ''} nesta matéria`
        : 'Seja o primeiro a reagir';
    }
  }

  async function renderComments(el) {
    const list = await PASocial.getComments(articleId);
    el.innerHTML = list.length
      ? list.map(commentHtml).join('')
      : '<p class="pa-social-empty">Nenhum comentário ainda. Inicie a conversa!</p>';
    el.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await PADialog.confirm({
          title: 'Excluir comentário',
          message: 'Deseja remover este comentário? Esta ação não pode ser desfeita.',
          confirmText: 'Excluir',
          variant: 'danger'
        });
        if (!ok) return;
        try {
          await PASocial.deleteComment(+btn.dataset.del);
          await renderComments(el);
          PADialog.toast('Comentário removido.', 'info');
        } catch (e) { PADialog.alert({ message: e.message, variant: 'warning' }); }
      });
    });
  }

  function bindEvents(root) {
    const reactEl = root.querySelector('.pa-reactions');
    reactEl?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-react]');
      if (!btn) return;
      if (!PASocial.isLoggedIn()) {
        location.href = PASocial.pagesPath('entrar.html') + '?redirect=' + encodeURIComponent(location.href);
        return;
      }
      try {
        await PASocial.setReaction(articleId, btn.dataset.react);
        await renderReactions(reactEl);
      } catch (err) { PADialog.alert({ message: err.message, variant: 'warning' }); }
    });

    const form = root.querySelector('.pa-comment-form');
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const ta = form.querySelector('textarea');
        const errEl = form.querySelector('.pa-social-err');
        try {
          await PASocial.addComment(articleId, ta.value);
          ta.value = '';
          if (errEl) errEl.textContent = '';
          await renderComments(root.querySelector('.pa-comments-list'));
        } catch (err) {
          if (errEl) errEl.textContent = err.message;
          else PADialog.alert({ message: err.message, variant: 'warning' });
        }
      });
    }
  }

  async function mount(container, id) {
    if (!container || !id) return;
    articleId = String(id);
    injectStyles();
    await PASocial.init();

    const logged = PASocial.isLoggedIn();
    const loginBlock = logged ? '' : `
      <div class="pa-login-prompt">
        <p>Entre com Google para curtir, reagir e comentar nesta matéria.</p>
        <a class="pa-google-btn" href="${PASocial.pagesPath('entrar.html')}?redirect=${encodeURIComponent(location.href)}">
          <span class="pa-google-g"></span> Continuar com Google
        </a>
      </div>`;

    const formBlock = logged ? `
      <form class="pa-comment-form">
        ${PASocial.avatarHtml(PASocial.getProfile()?.avatar_url, PASocial.getProfile()?.display_name, 40)}
        <div style="flex:1">
          <textarea placeholder="Escreva seu comentário…" maxlength="2000" required></textarea>
          <p class="pa-social-err"></p>
        </div>
        <button type="submit">Publicar</button>
      </form>` : '';

    container.innerHTML = `
      <section class="pa-social" id="paSocialRoot">
        <h3><i class="fas fa-comments"></i> Reações e Comentários</h3>
        ${loginBlock}
        <div class="pa-reactions"></div>
        <p class="pa-react-total"></p>
        ${formBlock}
        <div class="pa-comments-list"></div>
      </section>`;

    const root = container.querySelector('#paSocialRoot');
    await renderReactions(root.querySelector('.pa-reactions'));
    await renderComments(root.querySelector('.pa-comments-list'));
    bindEvents(root);
    mounted = true;
  }

  return { mount, injectStyles };
})();