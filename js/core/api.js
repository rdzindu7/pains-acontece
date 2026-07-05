const PAAPI = (function () {
  const ADMIN_USER = 'admin@painsacontece.com.br';
  const ADMIN_PASS = 'Pains@2026';
  const LS_ADMIN = 'pa_admin_state';

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

  return {
    login(user, pass) {
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        return Promise.resolve({ ok: true, token: 'static-' + Date.now(), user });
      }
      return Promise.reject(new Error('Credenciais inválidas'));
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

    aiChat(message, context) {
      return PAEngine.chat(message, context);
    },

    aiOrganize(text, hints) {
      return PAEngine.organizeNews(text, hints);
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
})();