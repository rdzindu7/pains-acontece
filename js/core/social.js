/**
 * PASocial — login Google, perfis, comentários, reações e selo verificado
 */
const PASocial = (function () {
  const LS = 'pa_social_local_v1';
  const REACTIONS = ['like', 'love', 'wow', 'sad', 'angry'];
  const REACTION_LABELS = { like: 'Curtir', love: 'Amei', wow: 'Uau', sad: 'Triste', angry: 'Grr' };
  const REACTION_ICONS = { like: 'fa-thumbs-up', love: 'fa-heart', wow: 'fa-surprise', sad: 'fa-sad-tear', angry: 'fa-angry' };

  let session = null;
  let profile = null;
  let listeners = [];
  let profilesCache = {};

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms || 6000))
    ]);
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function ownerEmail() {
    return (PAConfig?.ownerEmail || 'admin@painsacontece.com.br').toLowerCase();
  }

  function isOwnerEmail(email) {
    return (email || '').toLowerCase().trim() === ownerEmail();
  }

  function siteBase() {
    const cfg = PAConfig?.siteUrl?.replace(/\/$/, '');
    if (cfg) return cfg;
    const path = location.pathname;
    if (path.includes('/pages/')) return location.origin + path.replace(/\/pages\/.*$/, '');
    return location.origin + path.replace(/\/[^/]*$/, '') || location.origin;
  }

  function authCallbackUrl() {
    return siteBase() + '/pages/auth-callback.html';
  }

  function pagesPath(page) {
    const inPages = location.pathname.includes('/pages/');
    return inPages ? page : 'pages/' + page;
  }

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; }
  }

  function saveLocal(data) {
    localStorage.setItem(LS, JSON.stringify(data));
  }

  function ensureLocal() {
    const d = loadLocal();
    if (!d.profiles) d.profiles = {};
    if (!d.comments) d.comments = [];
    if (!d.reactions) d.reactions = [];
    if (!d.verified_requests) d.verified_requests = [];
    if (!d.session) d.session = null;
    return d;
  }

  function notify() {
    listeners.forEach(fn => { try { fn(session, profile); } catch {} });
  }

  function userFromSession(s) {
    if (!s?.user) return null;
    const u = s.user;
    const meta = u.user_metadata || {};
    return {
      id: u.id,
      email: u.email,
      name: meta.full_name || meta.name || u.email?.split('@')[0] || 'Leitor',
      avatar: meta.avatar_url || meta.picture || ''
    };
  }

  function defaultProfile(user) {
    return {
      id: user.id,
      email: user.email,
      display_name: user.name,
      avatar_url: user.avatar,
      bio: '',
      location: '',
      website: '',
      verified_badge: isOwnerEmail(user.email),
      verified_at: isOwnerEmail(user.email) ? new Date().toISOString() : null,
      verified_until: null
    };
  }

  function isVerified(p) {
    if (!p) return false;
    if (!p.verified_badge) return false;
    if (p.verified_until) {
      const until = new Date(p.verified_until);
      if (!isNaN(until.getTime()) && until < new Date()) return false;
    }
    return true;
  }

  function verifiedBadgeHtml(small) {
    const cls = small ? 'pa-vbadge pa-vbadge--sm' : 'pa-vbadge';
    return `<span class="${cls}" title="Verificado Pains Acontece"><i class="fas fa-check-circle"></i></span>`;
  }

  async function ensureProfile(user) {
    const client = PASupabase?.getClient?.();
    if (client && user?.id) {
      const { data } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) return data;
      const row = defaultProfile(user);
      await client.from('profiles').upsert(row);
      return row;
    }
    const local = ensureLocal();
    if (!local.profiles[user.id]) {
      local.profiles[user.id] = defaultProfile(user);
      saveLocal(local);
    }
    return local.profiles[user.id];
  }

  async function init() {
    PASupabase?.init?.();
    const local = ensureLocal();

    if (PASupabase?.isConfigured?.()) {
      try {
        const s = await withTimeout(PASupabase.getSession(), 5000);
        if (s?.user) {
          session = s;
          profile = await withTimeout(ensureProfile(userFromSession(s)), 5000);
          notify();
          return { session, profile };
        }
      } catch (err) {
        console.warn('[PASocial] session', err);
      }
    }

    if (local.session) {
      session = { user: local.session };
      profile = local.profiles[local.session.id] || defaultProfile(local.session);
      notify();
      return { session, profile };
    }

    notify();
    return { session: null, profile: null };
  }

  function getUser() {
    if (!session?.user) return null;
    return userFromSession(session);
  }

  function getProfile() {
    return profile;
  }

  function isLoggedIn() {
    return !!session?.user;
  }

  function onChange(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(f => f !== fn); };
  }

  async function signInWithGoogle() {
    const redirectTo = authCallbackUrl();
    if (PASupabase?.isConfigured?.()) {
      const res = await PASupabase.signInWithGoogle(redirectTo);
      if (!res.ok) throw new Error(res.error || 'Erro ao conectar com Google');
      return res;
    }
    const demoId = 'demo-' + Date.now();
    const demoUser = {
      id: demoId,
      email: 'leitor@gmail.com',
      name: 'Leitor Demo',
      avatar: ''
    };
    const local = ensureLocal();
    local.session = demoUser;
    local.profiles[demoId] = defaultProfile(demoUser);
    saveLocal(local);
    session = { user: { id: demoId, email: demoUser.email, user_metadata: { full_name: demoUser.name } } };
    profile = local.profiles[demoId];
    notify();
    return { ok: true, demo: true };
  }

  async function signOut() {
    if (PASupabase?.isConfigured?.()) await PASupabase.signOut();
    const local = ensureLocal();
    local.session = null;
    saveLocal(local);
    session = null;
    profile = null;
    notify();
  }

  async function updateProfile(updates) {
    const user = getUser();
    if (!user) throw new Error('Faça login para editar o perfil');
    const patch = {
      display_name: (updates.display_name || profile?.display_name || user.name).slice(0, 80),
      avatar_url: updates.avatar_url ?? profile?.avatar_url ?? '',
      bio: (updates.bio ?? profile?.bio ?? '').slice(0, 500),
      location: (updates.location ?? profile?.location ?? '').slice(0, 80),
      website: (updates.website ?? profile?.website ?? '').slice(0, 200)
    };

    const client = PASupabase?.getClient?.();
    if (client) {
      const { data, error } = await client.from('profiles').update(patch).eq('id', user.id).select().single();
      if (error) throw new Error(error.message);
      profile = data;
    } else {
      const local = ensureLocal();
      local.profiles[user.id] = { ...local.profiles[user.id], ...patch };
      saveLocal(local);
      profile = local.profiles[user.id];
    }
    notify();
    return profile;
  }

  async function getProfileById(id) {
    if (!id) return null;
    if (profilesCache[id]) return profilesCache[id];
    const client = PASupabase?.getClient?.();
    if (client) {
      const { data } = await client.from('profiles').select('*').eq('id', id).maybeSingle();
      if (data) { profilesCache[id] = data; return data; }
    }
    const local = ensureLocal();
    const p = local.profiles[id];
    if (p) { profilesCache[id] = p; return p; }
    return null;
  }

  async function getComments(articleId) {
    const client = PASupabase?.getClient?.();
    if (client) {
      const { data, error } = await client
        .from('article_comments')
        .select('*, profiles(display_name, avatar_url, verified_badge, verified_until)')
        .eq('article_id', String(articleId))
        .order('created_at', { ascending: false });
      if (!error && data) return sortComments(data);
    }
    const local = ensureLocal();
    const rows = local.comments.filter(c => String(c.article_id) === String(articleId));
    const enriched = await Promise.all(rows.map(async c => {
      const p = await getProfileById(c.user_id);
      return { ...c, profiles: p };
    }));
    return sortComments(enriched);
  }

  function sortComments(list) {
    return [...list].sort((a, b) => {
      const av = isVerified(a.profiles) ? 1 : 0;
      const bv = isVerified(b.profiles) ? 1 : 0;
      if (bv !== av) return bv - av;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  async function addComment(articleId, body) {
    const user = getUser();
    if (!user) throw new Error('Faça login para comentar');
    const text = (body || '').trim();
    if (!text) throw new Error('Escreva um comentário');
    if (text.length > 2000) throw new Error('Comentário muito longo (máx. 2000 caracteres)');

    const client = PASupabase?.getClient?.();
    if (client) {
      const { data, error } = await client
        .from('article_comments')
        .insert({ article_id: String(articleId), user_id: user.id, body: text })
        .select('*, profiles(display_name, avatar_url, verified_badge, verified_until)')
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const local = ensureLocal();
    const row = {
      id: Date.now(),
      article_id: String(articleId),
      user_id: user.id,
      body: text,
      created_at: new Date().toISOString(),
      profiles: profile
    };
    local.comments.unshift(row);
    saveLocal(local);
    return row;
  }

  async function deleteComment(commentId) {
    const user = getUser();
    if (!user) throw new Error('Não autorizado');
    const client = PASupabase?.getClient?.();
    if (client) {
      const { error } = await client.from('article_comments').delete().eq('id', commentId).eq('user_id', user.id);
      if (error) throw new Error(error.message);
      return;
    }
    const local = ensureLocal();
    local.comments = local.comments.filter(c => !(c.id === commentId && c.user_id === user.id));
    saveLocal(local);
  }

  async function getReactions(articleId) {
    const client = PASupabase?.getClient?.();
    if (client) {
      const { data } = await client.from('article_reactions').select('*').eq('article_id', String(articleId));
      if (data) return summarizeReactions(data);
    }
    const local = ensureLocal();
    const rows = local.reactions.filter(r => String(r.article_id) === String(articleId));
    return summarizeReactions(rows);
  }

  function summarizeReactions(rows) {
    const counts = {};
    REACTIONS.forEach(r => { counts[r] = 0; });
    let mine = null;
    const uid = getUser()?.id;
    rows.forEach(r => {
      if (counts[r.reaction] !== undefined) counts[r.reaction]++;
      if (uid && r.user_id === uid) mine = r.reaction;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total, mine };
  }

  async function setReaction(articleId, reaction) {
    const user = getUser();
    if (!user) throw new Error('Faça login para reagir');
    if (!REACTIONS.includes(reaction)) throw new Error('Reação inválida');

    const client = PASupabase?.getClient?.();
    const aid = String(articleId);

    if (client) {
      const current = await client.from('article_reactions').select('reaction').eq('article_id', aid).eq('user_id', user.id).maybeSingle();
      if (current.data?.reaction === reaction) {
        await client.from('article_reactions').delete().eq('article_id', aid).eq('user_id', user.id);
      } else if (current.data) {
        await client.from('article_reactions').update({ reaction }).eq('article_id', aid).eq('user_id', user.id);
      } else {
        await client.from('article_reactions').insert({ article_id: aid, user_id: user.id, reaction });
      }
      return getReactions(articleId);
    }

    const local = ensureLocal();
    const idx = local.reactions.findIndex(r => String(r.article_id) === aid && r.user_id === user.id);
    if (idx >= 0) {
      if (local.reactions[idx].reaction === reaction) local.reactions.splice(idx, 1);
      else local.reactions[idx].reaction = reaction;
    } else {
      local.reactions.push({ article_id: aid, user_id: user.id, reaction, created_at: new Date().toISOString() });
    }
    saveLocal(local);
    return getReactions(articleId);
  }

  async function requestVerified(message) {
    const user = getUser();
    if (!user) throw new Error('Faça login para solicitar o selo');
    if (isVerified(profile)) throw new Error('Você já possui o selo verificado');

    const plan = PAConfig?.verifiedPlan || {};
    const row = {
      user_id: user.id,
      status: 'pending',
      message: (message || '').slice(0, 500),
      plan: plan.period || 'anual',
      amount: plan.price || 29.9
    };

    const client = PASupabase?.getClient?.();
    if (client) {
      const pending = await client.from('verified_requests').select('id').eq('user_id', user.id).eq('status', 'pending').maybeSingle();
      if (pending.data) throw new Error('Você já tem uma solicitação em análise');
      const { error } = await client.from('verified_requests').insert(row);
      if (error) throw new Error(error.message);
      return row;
    }

    const local = ensureLocal();
    const exists = local.verified_requests.some(r => r.user_id === user.id && r.status === 'pending');
    if (exists) throw new Error('Você já tem uma solicitação em análise');
    row.id = Date.now();
    row.created_at = new Date().toISOString();
    local.verified_requests.unshift(row);
    saveLocal(local);
    return row;
  }

  async function getVerifiedProfiles() {
    const client = PASupabase?.getClient?.();
    if (client) {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('verified_badge', true)
        .order('verified_at', { ascending: false });
      if (!error && data) return data.filter(p => isVerified(p));
    }
    const local = ensureLocal();
    return Object.values(local.profiles).filter(p => isVerified(p));
  }

  async function getVerifiedRequests() {
    const client = PASupabase?.getClient?.();
    if (client) {
      const { data } = await client
        .from('verified_requests')
        .select('*, profiles(display_name, email, avatar_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      return data || [];
    }
    const local = ensureLocal();
    return local.verified_requests.filter(r => r.status === 'pending').map(r => ({
      ...r,
      profiles: local.profiles[r.user_id]
    }));
  }

  async function approveVerified(requestId) {
    const client = PASupabase?.getClient?.();
    const until = new Date();
    until.setFullYear(until.getFullYear() + 1);

    if (client) {
      const { data: req } = await client.from('verified_requests').select('user_id').eq('id', requestId).single();
      if (!req) throw new Error('Solicitação não encontrada');
      await client.from('verified_requests').update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: ownerEmail()
      }).eq('id', requestId);
      await client.from('profiles').update({
        verified_badge: true,
        verified_at: new Date().toISOString(),
        verified_until: until.toISOString()
      }).eq('id', req.user_id);
      profilesCache[req.user_id] = null;
      return;
    }

    const local = ensureLocal();
    const req = local.verified_requests.find(r => r.id === requestId);
    if (!req) throw new Error('Solicitação não encontrada');
    req.status = 'approved';
    req.reviewed_at = new Date().toISOString();
    if (local.profiles[req.user_id]) {
      local.profiles[req.user_id].verified_badge = true;
      local.profiles[req.user_id].verified_at = new Date().toISOString();
      local.profiles[req.user_id].verified_until = until.toISOString();
    }
    saveLocal(local);
  }

  async function resolveUserId(identifier) {
    const raw = (identifier || '').trim();
    if (!raw) throw new Error('Informe o ID ou e-mail do usuário');
    if (!raw.includes('@')) return raw;

    const email = raw.toLowerCase();
    const client = PASupabase?.getClient?.();
    if (client) {
      const { data, error } = await client.from('profiles').select('id, email, display_name').eq('email', email).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Nenhum perfil encontrado com este e-mail');
      return data.id;
    }

    const local = ensureLocal();
    const p = Object.values(local.profiles).find(x => (x.email || '').toLowerCase() === email);
    if (!p) throw new Error('Nenhum perfil encontrado com este e-mail (modo local)');
    return p.id;
  }

  async function grantVerifiedByUserId(userId, opts) {
    const uid = (userId || '').trim();
    if (!uid) throw new Error('ID do usuário inválido');
    const years = opts?.years || 1;
    const until = new Date();
    until.setFullYear(until.getFullYear() + years);
    const patch = {
      verified_badge: true,
      verified_at: new Date().toISOString(),
      verified_until: until.toISOString()
    };

    const client = PASupabase?.getClient?.();
    if (client) {
      const { data, error } = await client.from('profiles').update(patch).eq('id', uid).select().maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Perfil não encontrado para este ID');
      profilesCache[uid] = data;
      return data;
    }

    const local = ensureLocal();
    if (!local.profiles[uid]) throw new Error('Perfil não encontrado para este ID (modo local)');
    local.profiles[uid] = { ...local.profiles[uid], ...patch };
    saveLocal(local);
    profilesCache[uid] = local.profiles[uid];
    return local.profiles[uid];
  }

  async function revokeVerifiedByUserId(userId) {
    const uid = (userId || '').trim();
    if (!uid) throw new Error('ID do usuário inválido');
    const patch = { verified_badge: false, verified_at: null, verified_until: null };

    const client = PASupabase?.getClient?.();
    if (client) {
      const { data, error } = await client.from('profiles').update(patch).eq('id', uid).select().maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Perfil não encontrado para este ID');
      profilesCache[uid] = data;
      return data;
    }

    const local = ensureLocal();
    if (!local.profiles[uid]) throw new Error('Perfil não encontrado para este ID (modo local)');
    local.profiles[uid] = { ...local.profiles[uid], ...patch };
    saveLocal(local);
    profilesCache[uid] = local.profiles[uid];
    return local.profiles[uid];
  }

  async function grantVerifiedByIdentifier(identifier, opts) {
    const uid = await resolveUserId(identifier);
    return grantVerifiedByUserId(uid, opts);
  }

  async function revokeVerifiedByIdentifier(identifier) {
    const uid = await resolveUserId(identifier);
    return revokeVerifiedByUserId(uid);
  }

  async function rejectVerified(requestId) {
    const client = PASupabase?.getClient?.();
    if (client) {
      await client.from('verified_requests').update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: ownerEmail()
      }).eq('id', requestId);
      return;
    }
    const local = ensureLocal();
    const req = local.verified_requests.find(r => r.id === requestId);
    if (req) {
      req.status = 'rejected';
      req.reviewed_at = new Date().toISOString();
      saveLocal(local);
    }
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  function avatarHtml(url, name, size) {
    const s = size || 36;
    const initial = esc((name || '?')[0].toUpperCase());
    if (url) {
      return `<img class="pa-avatar" src="${esc(url)}" alt="" width="${s}" height="${s}" style="width:${s}px;height:${s}px" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'pa-avatar pa-avatar--letter',textContent:'${initial}'}))"/>`;
    }
    return `<span class="pa-avatar pa-avatar--letter" style="width:${s}px;height:${s}px;line-height:${s}px">${initial}</span>`;
  }

  return {
    REACTIONS,
    REACTION_LABELS,
    REACTION_ICONS,
    init,
    getUser,
    getProfile,
    isLoggedIn,
    isVerified,
    isOwnerEmail,
    verifiedBadgeHtml,
    avatarHtml,
    formatDate,
    onChange,
    signInWithGoogle,
    signOut,
    updateProfile,
    getProfileById,
    getComments,
    addComment,
    deleteComment,
    getReactions,
    setReaction,
    requestVerified,
    getVerifiedRequests,
    getVerifiedProfiles,
    approveVerified,
    rejectVerified,
    resolveUserId,
    grantVerifiedByUserId,
    revokeVerifiedByUserId,
    grantVerifiedByIdentifier,
    revokeVerifiedByIdentifier,
    pagesPath,
    esc
  };
})();