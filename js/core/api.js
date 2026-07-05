const PAAPI = (function () {
  const ADMIN_USER = 'admin@painsacontece.com.br';
  const ADMIN_PASS = 'Pains@2026';
  const LS_ADMIN = 'pa_admin_state_v2';

  function siteRoot() {
    const path = location.pathname;
    if (path.includes('/pages/')) return new URL('../', location.href);
    return new URL('./', location.href);
  }

  function dataUrl(file) {
    return new URL('data/' + file, siteRoot()).href;
  }

  function loadAdminState() {
    try { return JSON.parse(localStorage.getItem(LS_ADMIN)) || {}; } catch { return {}; }
  }

  function saveAdminState(state) {
    localStorage.setItem(LS_ADMIN, JSON.stringify(state));
  }

  function getState() {
    const s = loadAdminState();
    if (!s.pending) s.pending = [];
    if (!s.scanner) s.scanner = { last_scan: null, interval_minutes: 20, seen_urls: [] };
    return s;
  }

  async function fetchJson(file) {
    const res = await fetch(dataUrl(file), { cache: 'no-cache' });
    if (!res.ok) throw new Error('Arquivo não encontrado: ' + file);
    return res.json();
  }

  function mergeArticles(base, admin) {
    if (!admin?.length) return base;
    const map = new Map(base.map(a => [String(a.id), a]));
    admin.forEach(a => map.set(String(a.id), a));
    return [...map.values()].sort((a, b) => b.id - a.id);
  }

  function rowToArticle(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      lead: row.lead,
      content: row.content,
      cat: row.cat,
      status: row.status,
      img: row.img,
      author: row.author,
      date: row.date,
      timeAgo: row.time_ago,
      views: row.views ?? 0,
      verified: row.verified,
      confidence: row.confidence
    };
  }

  function articleToRow(data) {
    const row = {};
    if (data.title !== undefined) row.title = data.title;
    if (data.lead !== undefined) row.lead = data.lead;
    if (data.content !== undefined) row.content = data.content;
    if (data.cat !== undefined) row.cat = data.cat;
    if (data.status !== undefined) row.status = data.status;
    if (data.img !== undefined) row.img = data.img;
    if (data.author !== undefined) row.author = data.author;
    if (data.date !== undefined) row.date = data.date;
    if (data.timeAgo !== undefined) row.time_ago = data.timeAgo;
    if (data.views !== undefined) row.views = data.views;
    if (data.verified !== undefined) row.verified = data.verified;
    if (data.confidence !== undefined) row.confidence = data.confidence;
    return row;
  }

  function rowToPending(row) {
    return {
      id: row.id,
      title: row.title,
      lead: row.lead,
      content: row.content,
      cat: row.cat,
      img: row.img,
      author: row.author,
      verified: row.verified,
      confidence: row.confidence,
      source: row.source,
      source_url: row.source_url,
      region: row.region,
      found_at: row.found_at,
      status: 'pending'
    };
  }

  function pendingToRow(item) {
    return {
      id: item.id,
      title: item.title,
      lead: item.lead,
      content: item.content,
      cat: item.cat,
      img: item.img,
      author: item.author || 'IA Pains Acontece',
      verified: item.verified ?? false,
      confidence: item.confidence ?? 0,
      source: item.source,
      source_url: item.source_url,
      region: item.region,
      found_at: item.found_at || new Date().toISOString()
    };
  }

  function useSupabase() {
    return typeof PASupabase !== 'undefined' && PASupabase.isConfigured();
  }

  function sb() {
    return PASupabase.getClient();
  }

  /* ── Backend local (JSON + localStorage) ── */
  const local = {
    login(user, pass) {
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        return Promise.resolve({ ok: true, token: 'static-' + Date.now(), user });
      }
      return Promise.reject(new Error('Credenciais inválidas'));
    },

    logout() {
      return Promise.resolve();
    },

    isSupabaseMode() {
      return false;
    },

    async getArticles(status) {
      const base = await fetchJson('articles.json');
      const state = getState();
      let list = mergeArticles(base, state.articles);
      if (state.deleted?.length) list = list.filter(a => !state.deleted.includes(String(a.id)));
      if (status) list = list.filter(a => a.status === status);
      return list;
    },

    async getArticle(id) {
      const arts = await this.getArticles();
      return arts.find(a => String(a.id) === String(id));
    },

    async addArticle(data) {
      const state = getState();
      if (!state.articles) state.articles = [];
      const art = { id: Date.now(), views: 0, date: new Date().toLocaleDateString('pt-BR'), timeAgo: 'Agora', ...data };
      state.articles.unshift(art);
      saveAdminState(state);
      return art;
    },

    async updateArticle(id, data) {
      const state = getState();
      if (!state.articles) state.articles = await fetchJson('articles.json');
      const idx = state.articles.findIndex(a => String(a.id) === String(id));
      if (idx >= 0) state.articles[idx] = { ...state.articles[idx], ...data };
      else {
        const base = await fetchJson('articles.json');
        const b = base.find(a => String(a.id) === String(id));
        if (b) state.articles.push({ ...b, ...data });
      }
      saveAdminState(state);
      return state.articles.find(a => String(a.id) === String(id));
    },

    async deleteArticle(id) {
      const state = getState();
      if (!state.articles) state.articles = await fetchJson('articles.json');
      state.articles = state.articles.filter(a => String(a.id) !== String(id));
      const base = await fetchJson('articles.json');
      if (base.some(a => String(a.id) === String(id))) {
        state.deleted = state.deleted || [];
        if (!state.deleted.includes(String(id))) state.deleted.push(String(id));
      }
      saveAdminState(state);
      return { ok: true };
    },

    async incrementViews(id) {
      const state = getState();
      if (!state.articles) state.articles = [];
      let art = state.articles.find(a => String(a.id) === String(id));
      if (!art) {
        const base = await fetchJson('articles.json');
        art = base.find(a => String(a.id) === String(id));
        if (art) state.articles.push({ ...art });
      }
      if (art) {
        art.views = (art.views || 0) + 1;
        saveAdminState(state);
        return { views: art.views };
      }
      return { views: 0 };
    },

    getPending() {
      return Promise.resolve(getState().pending);
    },

    scannerStatus() {
      const s = getState().scanner;
      return Promise.resolve({ pending: getState().pending.length, interval_minutes: s.interval_minutes, last_scan: s.last_scan });
    },

    async runScanner() {
      const state = getState();
      const { items, seenUrls } = await PAScanner.scanNews(state.scanner.seen_urls || []);
      const existing = new Set([
        ...(await fetchJson('articles.json')).map(a => a.title.toLowerCase()),
        ...state.articles?.map(a => a.title.toLowerCase()) || [],
        ...state.pending.map(p => p.title.toLowerCase())
      ]);
      let found = 0;
      for (const item of items) {
        if (existing.has(item.title.toLowerCase())) continue;
        state.pending.unshift({ id: 'p-' + Date.now() + '-' + found, ...item, found_at: new Date().toISOString() });
        existing.add(item.title.toLowerCase());
        found++;
        if (found >= 8) break;
      }
      state.scanner.seen_urls = seenUrls.slice(-500);
      state.scanner.last_scan = new Date().toISOString();
      saveAdminState(state);
      return { found, total_pending: state.pending.length };
    },

    async approvePending(id) {
      const state = getState();
      const idx = state.pending.findIndex(p => p.id === id);
      if (idx < 0) throw new Error('Não encontrado');
      const p = state.pending.splice(idx, 1)[0];
      const art = await this.addArticle({
        title: p.title, lead: p.lead, content: p.content, cat: p.cat, status: 'pub',
        img: p.img, author: p.author || 'IA Pains Acontece', verified: p.verified, confidence: p.confidence
      });
      saveAdminState(state);
      return art;
    },

    rejectPending(id) {
      const state = getState();
      state.pending = state.pending.filter(p => p.id !== id);
      saveAdminState(state);
      return Promise.resolve({ ok: true });
    },

    sendPauta(data) {
      const state = getState();
      state.pautas = state.pautas || [];
      state.pautas.unshift({ ...data, date: new Date().toISOString() });
      saveAdminState(state);
      return Promise.resolve({ ok: true, message: 'Pauta recebida!' });
    },

    getEvents: () => fetchJson('events.json'),
    getJobs: () => fetchJson('jobs.json'),

    exportForGitHub() {
      const state = getState();
      return fetchJson('articles.json').then(base => {
        let articles = mergeArticles(base, state.articles);
        if (state.deleted?.length) articles = articles.filter(a => !state.deleted.includes(String(a.id)));
        return { articles, exported_at: new Date().toISOString() };
      });
    },

    importFromFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const data = JSON.parse(e.target.result);
            const articles = Array.isArray(data) ? data : data.articles;
            if (!articles) return reject(new Error('JSON inválido'));
            const state = getState();
            state.articles = articles;
            saveAdminState(state);
            resolve(articles);
          } catch (err) { reject(err); }
        };
        reader.readAsText(file);
      });
    }
  };

  /* ── Backend Supabase ── */
  const remote = {
    async login(user, pass) {
      const { data, error } = await sb().auth.signInWithPassword({ email: user, password: pass });
      if (error) throw new Error('Credenciais inválidas');
      return { ok: true, token: data.session.access_token, user: data.user.email };
    },

    async logout() {
      await PASupabase.signOut();
    },

    isSupabaseMode() {
      return true;
    },

    async getArticles(status) {
      let q = sb().from('articles').select('*').order('id', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(rowToArticle);
    },

    async getArticle(id) {
      const { data, error } = await sb().from('articles').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return rowToArticle(data);
    },

    async addArticle(data) {
      const row = articleToRow({
        views: 0,
        date: new Date().toLocaleDateString('pt-BR'),
        timeAgo: 'Agora',
        ...data
      });
      const { data: inserted, error } = await sb().from('articles').insert(row).select().single();
      if (error) throw error;
      return rowToArticle(inserted);
    },

    async updateArticle(id, data) {
      const row = articleToRow(data);
      const { data: updated, error } = await sb().from('articles').update(row).eq('id', id).select().maybeSingle();
      if (error) throw error;
      return rowToArticle(updated);
    },

    async deleteArticle(id) {
      const { error } = await sb().from('articles').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    },

    async incrementViews(id) {
      const { data, error } = await sb().rpc('increment_article_views', { article_id: Number(id) });
      if (error) throw error;
      return { views: data ?? 0 };
    },

    async getPending() {
      const { data, error } = await sb().from('pending_articles').select('*').order('found_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(rowToPending);
    },

    async scannerStatus() {
      const [{ count }, scannerRes] = await Promise.all([
        sb().from('pending_articles').select('*', { count: 'exact', head: true }),
        sb().from('scanner_state').select('*').eq('id', 1).maybeSingle()
      ]);
      const s = scannerRes.data || { interval_minutes: 20, last_scan: null };
      return { pending: count || 0, interval_minutes: s.interval_minutes, last_scan: s.last_scan };
    },

    async runScanner() {
      const { data: scannerRow } = await sb().from('scanner_state').select('*').eq('id', 1).maybeSingle();
      const seenUrls = scannerRow?.seen_urls || [];
      const { items, seenUrls: newSeen } = await PAScanner.scanNews(seenUrls);

      const [{ data: articles }, { data: pending }] = await Promise.all([
        sb().from('articles').select('title'),
        sb().from('pending_articles').select('title')
      ]);
      const existing = new Set([
        ...(articles || []).map(a => a.title.toLowerCase()),
        ...(pending || []).map(p => p.title.toLowerCase())
      ]);

      let found = 0;
      const toInsert = [];
      for (const item of items) {
        if (existing.has(item.title.toLowerCase())) continue;
        const row = pendingToRow({ id: 'p-' + Date.now() + '-' + found, ...item, found_at: new Date().toISOString() });
        toInsert.push(row);
        existing.add(item.title.toLowerCase());
        found++;
        if (found >= 8) break;
      }

      if (toInsert.length) {
        const { error } = await sb().from('pending_articles').insert(toInsert);
        if (error) throw error;
      }

      await sb().from('scanner_state').upsert({
        id: 1,
        seen_urls: newSeen.slice(-500),
        last_scan: new Date().toISOString(),
        interval_minutes: scannerRow?.interval_minutes || 20
      });

      const { count } = await sb().from('pending_articles').select('*', { count: 'exact', head: true });
      return { found, total_pending: count || 0 };
    },

    async approvePending(id) {
      const { data: p, error: e1 } = await sb().from('pending_articles').select('*').eq('id', id).maybeSingle();
      if (e1) throw e1;
      if (!p) throw new Error('Não encontrado');

      const art = await this.addArticle({
        title: p.title, lead: p.lead, content: p.content, cat: p.cat, status: 'pub',
        img: p.img, author: p.author || 'IA Pains Acontece', verified: p.verified, confidence: p.confidence
      });

      const { error: e2 } = await sb().from('pending_articles').delete().eq('id', id);
      if (e2) throw e2;
      return art;
    },

    async rejectPending(id) {
      const { error } = await sb().from('pending_articles').delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    },

    async sendPauta(data) {
      const { error } = await sb().from('pautas').insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message
      });
      if (error) throw error;
      return { ok: true, message: 'Pauta recebida!' };
    },

    async getEvents() {
      const { data, error } = await sb().from('events').select('*').eq('active', true).order('id');
      if (error) throw error;
      return data || [];
    },

    async getJobs() {
      const { data, error } = await sb().from('jobs').select('*').eq('active', true).order('id');
      if (error) throw error;
      return data || [];
    },

    async exportForGitHub() {
      const articles = await this.getArticles();
      return { articles, exported_at: new Date().toISOString(), source: 'supabase' };
    },

    importFromFile() {
      return Promise.reject(new Error('Com Supabase ativo, os dados já estão na nuvem. Importação não é necessária.'));
    }
  };

  function backend() {
    return useSupabase() ? remote : local;
  }

  return {
    login: (u, p) => backend().login(u, p),
    logout: () => backend().logout(),
    isSupabaseMode: () => backend().isSupabaseMode(),
    getArticles: (s) => backend().getArticles(s),
    getArticle: (id) => backend().getArticle(id),
    addArticle: (d) => backend().addArticle(d),
    updateArticle: (id, d) => backend().updateArticle(id, d),
    deleteArticle: (id) => backend().deleteArticle(id),
    incrementViews: (id) => backend().incrementViews(id),
    getPending: () => backend().getPending(),
    scannerStatus: () => backend().scannerStatus(),
    runScanner: () => backend().runScanner(),
    approvePending: (id) => backend().approvePending(id),
    rejectPending: (id) => backend().rejectPending(id),
    aiChat: (msg, ctx) => PAEngine.chat(msg, ctx),
    aiOrganize: (text, hints) => PAEngine.organizeNews(text, hints),
    sendPauta: (d) => backend().sendPauta(d),
    getEvents: () => backend().getEvents(),
    getJobs: () => backend().getJobs(),
    exportForGitHub: () => backend().exportForGitHub(),
    importFromFile: (f) => backend().importFromFile(f)
  };
})();