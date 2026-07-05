const PAAPI = (function () {
  const SCAN_INTERVAL_MINUTES = 5;

  const ADMIN_USERS = [
    { email: 'admin@painsacontece.com.br', pass: 'Pains@2026', role: 'owner', name: 'Proprietário' },
    { email: 'redacao@painsacontece.com.br', pass: 'Pains@Red2026', role: 'editor', name: 'Redação' },
    { email: 'maria@painsacontece.com.br', pass: 'Pains@Maria2026', role: 'editor', name: 'Maria Costa' }
  ];
  const LS_ADMIN = 'pa_admin_state_v2';

  function findAdmin(email) {
    const e = (email || '').toLowerCase().trim();
    return ADMIN_USERS.find(u => u.email.toLowerCase() === e) || null;
  }

  function resolveRole(email) {
    return findAdmin(email)?.role || 'editor';
  }

  function getAdminAccounts() {
    return ADMIN_USERS.map(u => ({ email: u.email, role: u.role, name: u.name }));
  }

  function isOwner() {
    return sessionStorage.getItem('pa_role') === 'owner';
  }

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

  function normalizeScanner(scanner) {
    const s = scanner && typeof scanner === 'object' ? { ...scanner } : {};
    s.interval_minutes = SCAN_INTERVAL_MINUTES;
    if (!Array.isArray(s.seen_urls)) s.seen_urls = [];
    if (!s.last_scan) s.last_scan = null;
    return s;
  }

  function normTitle(t) {
    return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }

  function articleKey(item) {
    if (!item) return '';
    const url = (item.source_url || item.link || '').trim().toLowerCase();
    if (url) return 'url:' + url;
    const title = normTitle(item.title);
    return title ? 'title:' + title : '';
  }

  function buildExistingKeys(articles, pending) {
    const keys = new Set();
    [...(articles || []), ...(pending || [])].forEach(item => {
      const k = articleKey(item);
      if (k) keys.add(k);
      const t = normTitle(item.title);
      if (t) keys.add('title:' + t);
    });
    return keys;
  }

  function isDuplicateArticle(item, keys) {
    const k = articleKey(item);
    const t = normTitle(item.title);
    return (k && keys.has(k)) || (t && keys.has('title:' + t));
  }

  function dedupePending(list) {
    const seen = new Set();
    return (list || []).filter(p => {
      const k = articleKey(p) || ('title:' + normTitle(p.title));
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function getState() {
    const s = loadAdminState();
    if (!s.pending) s.pending = [];
    const prevInterval = s.scanner?.interval_minutes;
    s.scanner = normalizeScanner(s.scanner);
    if (prevInterval !== SCAN_INTERVAL_MINUTES) saveAdminState(s);
    return s;
  }

  function isAdminSession() {
    return !!(sessionStorage.getItem('pa_auth_mode') || sessionStorage.getItem('pa_token'));
  }

  async function withArticleImages(data) {
    if (typeof PAArticleImages !== 'undefined' && PAArticleImages.prepareForPublish) {
      try {
        return await PAArticleImages.prepareForPublish(data);
      } catch (e) {
        console.warn('[api] article-images', e);
      }
    }
    return data;
  }

  function isRemoteImg(url) {
    return !!(url && /^https?:\/\//i.test(String(url)));
  }

  async function dropArticleImages(id, art) {
    if (typeof PAArticleImages !== 'undefined' && PAArticleImages.removeForArticle) {
      try {
        await PAArticleImages.removeForArticle(id, art);
      } catch (e) {
        console.warn('[api] drop image', e);
      }
    }
  }

  function isPublicSitePage() {
    return !/\/pages\/admin\.html/i.test(location.pathname);
  }

  function getDeletedSet() {
    const state = getState();
    return new Set((state.deleted || []).map(String));
  }

  function isArticleDeleted(id) {
    if (isPublicSitePage()) return false;
    if (!isAdminSession()) return false;
    return getDeletedSet().has(String(id));
  }

  function applyDeletedFilter(list) {
    if (isPublicSitePage()) return list;
    if (!isAdminSession()) return list;
    const hidden = getDeletedSet();
    if (!hidden.size) return list;
    return list.filter(a => !hidden.has(String(a.id)));
  }

  async function fetchArticleFromJson(id) {
    try {
      const sid = String(id);
      if (isArticleDeleted(sid)) return null;
      const base = await fetchJson('articles.json');
      const fromBase = base.find(a => String(a.id) === sid);
      if (fromBase) return fromBase;
      const state = getState();
      return (state.articles || []).find(a => String(a.id) === sid) || null;
    } catch {
      return null;
    }
  }

  async function fetchArticlesFromJson(status) {
    try {
      const base = await fetchJson('articles.json');
      const state = getState();
      let list = applyDeletedFilter(mergeArticles(base, state.articles));
      if (status) list = list.filter(a => a.status === status);
      return list;
    } catch {
      return [];
    }
  }

  async function fetchArticlesForAdmin(status) {
    try {
      const base = await fetchJson('articles.json');
      const state = getState();
      let list = mergeArticles(base, state.articles);
      if (state.deleted?.length) {
        list = list.filter(a => !state.deleted.includes(String(a.id)));
      }
      if (status) list = list.filter(a => a.status === status);
      return list;
    } catch {
      return [];
    }
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
      img_source: row.img_source ?? row.imgSource,
      video: row.video,
      author: row.author,
      date: row.date,
      timeAgo: row.time_ago,
      views: row.views ?? 0,
      verified: row.verified,
      confidence: row.confidence,
      deepVerified: row.deep_verified ?? row.deepVerified,
      source_url: row.source_url,
      quickLead: row.quick_lead ?? row.quickLead,
      pubISO: row.pub_iso ?? row.pubISO,
      world: row.world ?? false
    };
  }

  function articleToRow(data) {
    const row = {};
    if (data.id !== undefined) row.id = data.id;
    if (data.title !== undefined) row.title = data.title;
    if (data.lead !== undefined) row.lead = data.lead;
    if (data.content !== undefined) row.content = data.content;
    if (data.cat !== undefined) row.cat = data.cat;
    if (data.status !== undefined) row.status = data.status;
    if (data.img !== undefined) row.img = data.img;
    if (data.img_source !== undefined) row.img_source = data.img_source;
    if (data.video !== undefined) row.video = data.video;
    if (data.author !== undefined) row.author = data.author;
    if (data.date !== undefined) row.date = data.date;
    if (data.timeAgo !== undefined) row.time_ago = data.timeAgo;
    if (data.views !== undefined) row.views = data.views;
    if (data.verified !== undefined) row.verified = data.verified;
    if (data.confidence !== undefined) row.confidence = data.confidence;
    if (data.deepVerified !== undefined) row.deep_verified = data.deepVerified;
    if (data.source_url !== undefined) row.source_url = data.source_url;
    if (data.quickLead !== undefined) row.quick_lead = data.quickLead;
    if (data.pubISO !== undefined) row.pub_iso = data.pubISO;
    if (data.world !== undefined) row.world = data.world;
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

  function supabaseConfigured() {
    return typeof PASupabase !== 'undefined' && PASupabase.isConfigured();
  }

  function sb() {
    return PASupabase.getClient();
  }

  let cloudOk = null;

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms || 6000))
    ]);
  }

  async function isCloudReady() {
    if (!supabaseConfigured()) return false;
    if (cloudOk !== null) return cloudOk;
    try {
      const { error } = await withTimeout(
        sb().from('articles').select('id', { count: 'exact', head: true }),
        5000
      );
      cloudOk = !error;
    } catch {
      cloudOk = false;
    }
    return cloudOk;
  }

  function isLocalAuth() {
    return sessionStorage.getItem('pa_auth_mode') === 'local';
  }

  async function hasCloudSession() {
    if (!supabaseConfigured() || isLocalAuth()) return false;
    try {
      const session = await PASupabase.getSession();
      return !!session?.access_token;
    } catch {
      return false;
    }
  }

  function scheduleAutoSync() {
    if (typeof PAAutoSync !== 'undefined' && isAdminSession()) {
      PAAutoSync.schedule();
    }
  }

  async function getBackend() {
    if (!supabaseConfigured() || isLocalAuth()) return local;
    if (await hasCloudSession()) {
      sessionStorage.setItem('pa_auth_mode', 'cloud');
      return remote;
    }
    if (sessionStorage.getItem('pa_auth_mode') === 'cloud') {
      sessionStorage.removeItem('pa_auth_mode');
    }
    return local;
  }

  async function callBackend(method, ...args) {
    const b = await getBackend();
    if (typeof b[method] === 'function') {
      try {
        const result = await b[method](...args);
        if (result !== undefined) return result;
      } catch (err) {
        console.warn(`[api] ${method}:`, err?.message || err);
      }
    }
    if (typeof local[method] === 'function') return local[method](...args);
    if (method.startsWith('get')) return [];
    throw new Error('Não disponível');
  }

  async function getArticlesPublic(status) {
    const jsonList = await fetchArticlesFromJson(status);
    let remoteList = [];
    if (supabaseConfigured()) {
      try {
        const ready = await withTimeout(isCloudReady(), 3500);
        if (ready) {
          let q = sb().from('articles').select('*').order('id', { ascending: false });
          if (status) q = q.eq('status', status);
          const { data, error } = await withTimeout(q, 4000);
          if (!error) remoteList = (data || []).map(rowToArticle);
        }
      } catch {}
    }
    const state = getState();
    const localPub = (state.articles || []).filter(a => !status || a.status === status);
    let merged = mergeArticles(jsonList, localPub);
    if (remoteList.length) merged = mergeArticles(merged, remoteList);
    return merged;
  }

  async function getArticlesAdmin(status) {
    let remoteList = [];
    if (supabaseConfigured() && sessionStorage.getItem('pa_auth_mode')) {
      try {
        if (await isCloudReady()) {
          let q = sb().from('articles').select('*').order('id', { ascending: false });
          if (status) q = q.eq('status', status);
          const { data, error } = await q;
          if (!error) remoteList = (data || []).map(rowToArticle);
        }
      } catch {}
    }
    const jsonList = await fetchArticlesForAdmin(status);
    if (remoteList.length) return mergeArticles(jsonList, remoteList);
    return jsonList;
  }

  async function getArticlePublic(id) {
    if (isArticleDeleted(id)) return null;
    try {
      if (supabaseConfigured() && await isCloudReady()) {
        const { data, error } = await sb().from('articles').select('*').eq('id', id).maybeSingle();
        if (!error && data && data.status === 'pub') return rowToArticle(data);
      }
    } catch {}
    const fromJson = await fetchArticleFromJson(id);
    if (fromJson) return fromJson;
    return (getState().articles || []).find(a => String(a.id) === String(id)) || null;
  }

  function normalizePauta(data) {
    return {
      name: data.nome || data.name || '',
      email: data.email || '',
      phone: data.whatsapp || data.phone || '',
      message: [data.assunto, data.descricao].filter(Boolean).join('\n\n') || data.message || ''
    };
  }

  function staticAdminLogin(user, pass) {
    const acc = ADMIN_USERS.find(u => u.email.toLowerCase() === (user || '').toLowerCase().trim() && u.pass === pass);
    if (acc) {
      sessionStorage.setItem('pa_auth_mode', 'local');
      sessionStorage.setItem('pa_role', acc.role);
      sessionStorage.setItem('pa_user_name', acc.name);
      return { ok: true, token: 'local-' + acc.role + '-' + Date.now(), user: acc.email, mode: 'local', role: acc.role, name: acc.name };
    }
    return null;
  }

  function mergeById(base, extra) {
    if (!extra?.length) return base || [];
    const map = new Map((base || []).map(item => [String(item.id), item]));
    extra.forEach(item => map.set(String(item.id), item));
    return [...map.values()].sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  /* ── Backend local (JSON + localStorage) ── */
  const local = {
    login(user, pass) {
      const res = staticAdminLogin(user, pass);
      if (res) return Promise.resolve(res);
      return Promise.reject(new Error('Credenciais inválidas'));
    },

    logout() {
      return Promise.resolve();
    },

    isSupabaseMode() {
      return false;
    },

    async getArticles(status) {
      return fetchArticlesForAdmin(status);
    },

    async getArticle(id) {
      if (isArticleDeleted(id)) return null;
      const arts = await this.getArticles();
      const found = arts.find(a => String(a.id) === String(id));
      if (found) return found;
      return fetchArticleFromJson(id);
    },

    async addArticle(data) {
      const state = getState();
      if (!state.articles) state.articles = [];
      let date = data.date;
      let timeAgo = data.timeAgo;
      if (data.pubISO) {
        const pd = new Date(data.pubISO);
        if (!isNaN(pd.getTime())) {
          date = date || pd.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          if (typeof PAScanner !== 'undefined') timeAgo = timeAgo || PAScanner.formatDate(pd);
        }
      }
      const enriched = await withArticleImages({
        id: data.id || Date.now(),
        views: 0,
        date: date || new Date().toLocaleDateString('pt-BR'),
        timeAgo: timeAgo || 'Agora',
        ...data
      });
      const art = { ...enriched };
      state.articles.unshift(art);
      saveAdminState(state);
      return art;
    },

    async updateArticle(id, data) {
      const state = getState();
      if (!state.articles) state.articles = await fetchJson('articles.json');
      const sid = String(id);
      const idx = state.articles.findIndex(a => String(a.id) === sid);
      let prev = idx >= 0 ? state.articles[idx] : null;
      if (!prev) {
        const base = await fetchJson('articles.json');
        prev = base.find(a => String(a.id) === sid) || null;
      }
      let patch = { ...data };
      if (patch.img && isRemoteImg(patch.img) && typeof PAArticleImages !== 'undefined') {
        patch = await withArticleImages({ ...prev, ...patch, id });
      }
      if (idx >= 0) state.articles[idx] = { ...state.articles[idx], ...patch };
      else if (prev) state.articles.push({ ...prev, ...patch });
      saveAdminState(state);
      return state.articles.find(a => String(a.id) === sid);
    },

    async deleteArticle(id) {
      const state = getState();
      if (!state.articles) state.articles = await fetchJson('articles.json');
      const sid = String(id);
      const base = await fetchJson('articles.json').catch(() => []);
      const art = state.articles.find(a => String(a.id) === sid) || base.find(a => String(a.id) === sid);
      await dropArticleImages(id, art);
      state.articles = state.articles.filter(a => String(a.id) !== sid);
      if (base.some(a => String(a.id) === sid)) {
        state.deleted = state.deleted || [];
        if (!state.deleted.includes(sid)) state.deleted.push(sid);
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

    incrementSiteVisits() {
      const state = getState();
      state.site_visits = (state.site_visits || 0) + 1;
      saveAdminState(state);
      return Promise.resolve({ total: state.site_visits });
    },

    getSiteVisits() {
      const state = getState();
      return Promise.resolve({ total: state.site_visits || 0 });
    },

    getPending() {
      const state = getState();
      const deduped = dedupePending(state.pending);
      if (deduped.length !== state.pending.length) {
        state.pending = deduped;
        saveAdminState(state);
      }
      return Promise.resolve(deduped);
    },

    scannerStatus() {
      const s = getState().scanner;
      return Promise.resolve({ pending: getState().pending.length, interval_minutes: SCAN_INTERVAL_MINUTES, last_scan: s.last_scan });
    },

    async runScanner() {
      const state = getState();
      const { items, seenUrls } = await PAScanner.scanNewsQuick(state.scanner.seen_urls || []);
      const baseArts = await fetchJson('articles.json');
      const mergedArts = mergeArticles(baseArts, state.articles);
      const existing = buildExistingKeys(mergedArts, state.pending);
      let found = 0;
      for (const item of items) {
        if (isDuplicateArticle(item, existing)) continue;
        state.pending.unshift({ id: 'p-' + Date.now() + '-' + found, ...item, found_at: new Date().toISOString() });
        const k = articleKey(item);
        if (k) existing.add(k);
        const t = normTitle(item.title);
        if (t) existing.add('title:' + t);
        found++;
        if (found >= 8) break;
      }
      state.pending = dedupePending(state.pending);
      state.scanner.seen_urls = seenUrls.slice(-500);
      state.scanner.last_scan = new Date().toISOString();
      state.scanner.interval_minutes = SCAN_INTERVAL_MINUTES;
      saveAdminState(state);
      return { found, total_pending: state.pending.length };
    },

    async approvePending(id) {
      const state = getState();
      const sid = String(id);
      const p = (state.pending || []).find(x => String(x.id) === sid);
      if (!p) throw new Error('Não encontrado');
      const baseArts = await fetchJson('articles.json').catch(() => []);
      const mergedArts = mergeArticles(baseArts, state.articles);
      if (isDuplicateArticle(p, buildExistingKeys(mergedArts, []))) {
        const fresh = getState();
        fresh.pending = (fresh.pending || []).filter(x => String(x.id) !== sid);
        saveAdminState(fresh);
        throw new Error('duplicate');
      }
      const art = await this.addArticle({
        title: p.title, lead: p.lead, content: p.content, cat: p.cat, status: 'pub',
        img: p.img, img_source: p.img_source || p.img, video: p.video || '', author: p.author || 'IA Pains Acontece', verified: p.verified, confidence: p.confidence,
        world: p.world || p.cat === 'Mundo', source_url: p.source_url,
        pubISO: p.pubISO, date: p.date, timeAgo: p.timeAgo, source: p.source
      });
      const fresh = getState();
      fresh.pending = (fresh.pending || []).filter(x => String(x.id) !== sid);
      saveAdminState(fresh);
      return art;
    },

    rejectPending(id) {
      const state = getState();
      const sid = String(id);
      state.pending = (state.pending || []).filter(p => String(p.id) !== sid);
      saveAdminState(state);
      return Promise.resolve({ ok: true });
    },

    resetScanner() {
      const state = getState();
      state.scanner = normalizeScanner({ last_scan: null, seen_urls: [] });
      state.pending = [];
      saveAdminState(state);
      return Promise.resolve({ ok: true, message: 'Busca resetada. Todas as fontes serão verificadas novamente.' });
    },

    async purgeAllPublications() {
      const base = await fetchJson('articles.json').catch(() => []);
      const state = getState();
      const allArts = mergeArticles(base, state.articles || []);
      if (typeof PAArticleImages !== 'undefined' && PAArticleImages.purgeAll) {
        try { await PAArticleImages.purgeAll(allArts); } catch (e) { console.warn('[api] purge images', e); }
      }
      const allIds = [...new Set([
        ...base.map(a => String(a.id)),
        ...(state.articles || []).map(a => String(a.id))
      ])];
      state.articles = [];
      state.deleted = allIds;
      state.pending = [];
      state.scanner = normalizeScanner({ last_scan: null, seen_urls: [] });
      state.purged_at = new Date().toISOString();
      saveAdminState(state);
      try { localStorage.removeItem('pa_articles_cache_v2'); } catch {}
      return { ok: true, removed: allIds.length };
    },

    sendPauta(data) {
      const state = getState();
      state.pautas = state.pautas || [];
      const p = normalizePauta(data);
      state.pautas.unshift({ ...p, ...data, date: new Date().toISOString() });
      saveAdminState(state);
      return Promise.resolve({ ok: true, message: 'Pauta recebida!' });
    },

    async getEvents() {
      const base = await fetchJson('events.json');
      return mergeById(base, getState().events);
    },

    async getJobs() {
      const base = await fetchJson('jobs.json');
      return mergeById(base, getState().jobs);
    },

    async addEvent(data) {
      const state = getState();
      if (!state.events) state.events = [];
      const ev = {
        id: Date.now(),
        active: true,
        date: data.date || '',
        title: data.title || '',
        place: data.place || '',
        time: data.time || ''
      };
      state.events.unshift(ev);
      saveAdminState(state);
      return ev;
    },

    async deleteEvent(id) {
      const state = getState();
      state.events = (state.events || []).filter(e => String(e.id) !== String(id));
      saveAdminState(state);
      return { ok: true };
    },

    async addJob(data) {
      const state = getState();
      if (!state.jobs) state.jobs = [];
      const job = {
        id: Date.now(),
        active: true,
        title: data.title || '',
        company: data.company || '',
        type: data.type || 'CLT'
      };
      state.jobs.unshift(job);
      saveAdminState(state);
      return job;
    },

    async deleteJob(id) {
      const state = getState();
      state.jobs = (state.jobs || []).filter(j => String(j.id) !== String(id));
      saveAdminState(state);
      return { ok: true };
    },

    async getAds() {
      const state = getState();
      const base = await fetchJson('ads.json').catch(() => []);
      let list = mergeById(base, state.ads);
      const deleted = state.deletedAds || [];
      if (deleted.length) list = list.filter(a => !deleted.includes(String(a.id)));
      return list;
    },

    async addAd(data) {
      const state = getState();
      if (!state.ads) state.ads = [];
      const ad = {
        id: Date.now(),
        active: data.active !== false,
        slot: data.slot || 'banner',
        title: data.title || '',
        text: data.text || '',
        image: data.image || '',
        link: data.link || '#publicidades',
        advertiser: data.advertiser || '',
        cta: data.cta || 'Saiba mais',
        expires: data.expires || null
      };
      state.ads.unshift(ad);
      saveAdminState(state);
      return ad;
    },

    async updateAd(id, data) {
      const state = getState();
      if (!state.ads) state.ads = [];
      const idx = state.ads.findIndex(a => String(a.id) === String(id));
      if (idx >= 0) {
        state.ads[idx] = { ...state.ads[idx], ...data };
        saveAdminState(state);
        return state.ads[idx];
      }
      const base = await fetchJson('ads.json').catch(() => []);
      const b = base.find(a => String(a.id) === String(id));
      if (b) {
        state.ads.push({ ...b, ...data });
        saveAdminState(state);
        return state.ads[state.ads.length - 1];
      }
      throw new Error('Anúncio não encontrado');
    },

    async deleteAd(id) {
      const state = getState();
      state.ads = (state.ads || []).filter(a => String(a.id) !== String(id));
      const base = await fetchJson('ads.json').catch(() => []);
      if (base.some(a => String(a.id) === String(id))) {
        state.deletedAds = state.deletedAds || [];
        if (!state.deletedAds.includes(String(id))) state.deletedAds.push(String(id));
      }
      saveAdminState(state);
      return { ok: true };
    },

    async getServices() {
      const state = getState();
      const base = await fetchJson('services.json').catch(() => []);
      let list = mergeById(base, state.services);
      const deleted = state.deletedServices || [];
      if (deleted.length) list = list.filter(s => !deleted.includes(String(s.id)));
      return list.filter(s => s.active !== false);
    },

    async getServicesAdmin() {
      const state = getState();
      const base = await fetchJson('services.json').catch(() => []);
      let list = mergeById(base, state.services);
      const deleted = state.deletedServices || [];
      if (deleted.length) list = list.filter(s => !deleted.includes(String(s.id)));
      return list;
    },

    async addService(data) {
      const state = getState();
      if (!state.services) state.services = [];
      const item = {
        id: Date.now(),
        active: data.active !== false,
        title: data.title || '',
        description: data.description || '',
        icon: data.icon || 'fa-building',
        image: data.image || '',
        link: data.link || '#',
        phone: data.phone || ''
      };
      state.services.unshift(item);
      saveAdminState(state);
      return item;
    },

    async updateService(id, data) {
      const state = getState();
      if (!state.services) state.services = [];
      const idx = state.services.findIndex(s => String(s.id) === String(id));
      if (idx >= 0) {
        state.services[idx] = { ...state.services[idx], ...data };
        saveAdminState(state);
        return state.services[idx];
      }
      const base = await fetchJson('services.json').catch(() => []);
      const b = base.find(s => String(s.id) === String(id));
      if (b) {
        state.services.push({ ...b, ...data });
        saveAdminState(state);
        return state.services[state.services.length - 1];
      }
      throw new Error('Serviço não encontrado');
    },

    async deleteService(id) {
      const state = getState();
      state.services = (state.services || []).filter(s => String(s.id) !== String(id));
      const base = await fetchJson('services.json').catch(() => []);
      if (base.some(s => String(s.id) === String(id))) {
        state.deletedServices = state.deletedServices || [];
        if (!state.deletedServices.includes(String(id))) state.deletedServices.push(String(id));
      }
      saveAdminState(state);
      return { ok: true };
    },

    async getRestaurants() {
      const state = getState();
      const base = await fetchJson('restaurants.json').catch(() => []);
      let list = mergeById(base, state.restaurants);
      const deleted = state.deletedRestaurants || [];
      if (deleted.length) list = list.filter(r => !deleted.includes(String(r.id)));
      return list.filter(r => r.active !== false);
    },

    async getRestaurantsAdmin() {
      const state = getState();
      const base = await fetchJson('restaurants.json').catch(() => []);
      let list = mergeById(base, state.restaurants);
      const deleted = state.deletedRestaurants || [];
      if (deleted.length) list = list.filter(r => !deleted.includes(String(r.id)));
      return list;
    },

    async addRestaurant(data) {
      const state = getState();
      if (!state.restaurants) state.restaurants = [];
      const item = {
        id: Date.now(),
        active: data.active !== false,
        sponsored: data.sponsored !== false,
        name: data.name || '',
        type: data.type || '',
        location: data.location || 'Pains, MG',
        phone: data.phone || '',
        description: data.description || '',
        image: data.image || '',
        menu: data.menu || ''
      };
      state.restaurants.unshift(item);
      saveAdminState(state);
      return item;
    },

    async updateRestaurant(id, data) {
      const state = getState();
      if (!state.restaurants) state.restaurants = [];
      const idx = state.restaurants.findIndex(r => String(r.id) === String(id));
      if (idx >= 0) {
        state.restaurants[idx] = { ...state.restaurants[idx], ...data };
        saveAdminState(state);
        return state.restaurants[idx];
      }
      const base = await fetchJson('restaurants.json').catch(() => []);
      const b = base.find(r => String(r.id) === String(id));
      if (b) {
        state.restaurants.push({ ...b, ...data });
        saveAdminState(state);
        return state.restaurants[state.restaurants.length - 1];
      }
      throw new Error('Restaurante não encontrado');
    },

    async deleteRestaurant(id) {
      const state = getState();
      state.restaurants = (state.restaurants || []).filter(r => String(r.id) !== String(id));
      const base = await fetchJson('restaurants.json').catch(() => []);
      if (base.some(r => String(r.id) === String(id))) {
        state.deletedRestaurants = state.deletedRestaurants || [];
        if (!state.deletedRestaurants.includes(String(id))) state.deletedRestaurants.push(String(id));
      }
      saveAdminState(state);
      return { ok: true };
    },

    async getBuses() {
      const state = getState();
      const base = await fetchJson('buses.json').catch(() => []);
      let list = mergeById(base, state.buses);
      const deleted = state.deletedBuses || [];
      if (deleted.length) list = list.filter(b => !deleted.includes(String(b.id)));
      return list.filter(b => b.active !== false);
    },

    async getBusesAdmin() {
      const state = getState();
      const base = await fetchJson('buses.json').catch(() => []);
      let list = mergeById(base, state.buses);
      const deleted = state.deletedBuses || [];
      if (deleted.length) list = list.filter(b => !deleted.includes(String(b.id)));
      return list;
    },

    async addBus(data) {
      const state = getState();
      if (!state.buses) state.buses = [];
      const item = {
        id: Date.now(),
        active: data.active !== false,
        company: data.company || '',
        phone: data.phone || '',
        origin: data.origin || 'pains',
        destination: data.destination || '',
        duration_min: Number(data.duration_min) || 0,
        price_ref: data.price_ref || '',
        stop_origin: data.stop_origin || '',
        stop_destination: data.stop_destination || '',
        notes: data.notes || '',
        schedules: Array.isArray(data.schedules) ? data.schedules : []
      };
      state.buses.unshift(item);
      saveAdminState(state);
      return item;
    },

    async updateBus(id, data) {
      const state = getState();
      if (!state.buses) state.buses = [];
      const idx = state.buses.findIndex(b => String(b.id) === String(id));
      if (idx >= 0) {
        state.buses[idx] = { ...state.buses[idx], ...data };
        saveAdminState(state);
        return state.buses[idx];
      }
      const base = await fetchJson('buses.json').catch(() => []);
      const b = base.find(x => String(x.id) === String(id));
      if (b) {
        state.buses.push({ ...b, ...data });
        saveAdminState(state);
        return state.buses[state.buses.length - 1];
      }
      throw new Error('Linha não encontrada');
    },

    async deleteBus(id) {
      const state = getState();
      state.buses = (state.buses || []).filter(b => String(b.id) !== String(id));
      const base = await fetchJson('buses.json').catch(() => []);
      if (base.some(b => String(b.id) === String(id))) {
        state.deletedBuses = state.deletedBuses || [];
        if (!state.deletedBuses.includes(String(id))) state.deletedBuses.push(String(id));
      }
      saveAdminState(state);
      return { ok: true };
    },

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
      if (error || !data?.session) {
        throw new Error(error?.message || 'Credenciais inválidas');
      }
      sessionStorage.setItem('pa_auth_mode', 'cloud');
      const role = resolveRole(data.user.email);
      sessionStorage.setItem('pa_role', role);
      cloudOk = null;
      return { ok: true, token: data.session.access_token, user: data.user.email, mode: 'cloud', role };
    },

    async logout() {
      await PASupabase.signOut();
    },

    isSupabaseMode() {
      return true;
    },

    async getArticles(status) {
      let remoteList = [];
      try {
        let q = sb().from('articles').select('*').order('id', { ascending: false });
        if (status) q = q.eq('status', status);
        const { data, error } = await q;
        if (!error) remoteList = (data || []).map(rowToArticle);
      } catch {}
      const localList = await fetchArticlesForAdmin(status);
      if (remoteList.length) return mergeArticles(localList, remoteList);
      return localList;
    },

    async getArticle(id) {
      try {
        const { data, error } = await sb().from('articles').select('*').eq('id', id).maybeSingle();
        if (!error && data) return rowToArticle(data);
      } catch {}
      const localArt = await local.getArticle(id);
      if (localArt) return localArt;
      return fetchArticleFromJson(id);
    },

    async addArticle(data) {
      const enriched = await withArticleImages({
        id: data.id || Date.now(),
        views: 0,
        date: new Date().toLocaleDateString('pt-BR'),
        timeAgo: 'Agora',
        ...data
      });
      const row = articleToRow(enriched);
      try {
        const { data: inserted, error } = await sb().from('articles').insert(row).select().single();
        if (!error && inserted) return rowToArticle(inserted);
        if (error) console.warn('Supabase insert falhou, salvando localmente:', error.message);
      } catch (e) {
        console.warn('Supabase indisponível, salvando localmente:', e);
      }
      return local.addArticle(enriched);
    },

    async updateArticle(id, data) {
      const row = articleToRow(data);
      try {
        const { data: updated, error } = await sb().from('articles').update(row).eq('id', id).select().maybeSingle();
        if (!error && updated) return rowToArticle(updated);
        if (error) console.warn('[api] supabase update:', error.message);
      } catch (e) {
        console.warn('[api] supabase update:', e);
      }
      return local.updateArticle(id, data);
    },

    async deleteArticle(id) {
      try {
        const { error } = await sb().from('articles').delete().eq('id', id);
        if (error) console.warn('[api] supabase delete:', error.message);
      } catch {}
      return local.deleteArticle(id);
    },

    async resetScanner() {
      try {
        await sb().from('pending_articles').delete().neq('id', '');
        await sb().from('scanner_state').upsert({
          id: 1, seen_urls: [], last_scan: null, interval_minutes: SCAN_INTERVAL_MINUTES
        });
      } catch {}
      return local.resetScanner();
    },

    async incrementViews(id) {
      try {
        const { data, error } = await sb().rpc('increment_article_views', { article_id: Number(id) });
        if (error) return local.incrementViews(id);
        return { views: data ?? 0 };
      } catch {
        return local.incrementViews(id);
      }
    },

    async incrementSiteVisits() {
      try {
        const { data, error } = await sb().rpc('increment_site_visits');
        if (!error && data != null) return { total: Number(data) || 0 };
      } catch (e) {
        console.warn('[api] incrementSiteVisits', e);
      }
      return local.incrementSiteVisits();
    },

    async getSiteVisits() {
      try {
        const { data, error } = await sb().from('site_stats').select('total_visits').eq('id', 1).maybeSingle();
        if (!error && data) return { total: Number(data.total_visits) || 0 };
      } catch {}
      return local.getSiteVisits();
    },

    async getPending() {
      const { data, error } = await sb().from('pending_articles').select('*').order('found_at', { ascending: false });
      if (error) throw error;
      return dedupePending((data || []).map(rowToPending));
    },

    async scannerStatus() {
      const [{ count }, scannerRes] = await Promise.all([
        sb().from('pending_articles').select('*', { count: 'exact', head: true }),
        sb().from('scanner_state').select('*').eq('id', 1).maybeSingle()
      ]);
      const s = scannerRes.data || { last_scan: null };
      if (s.interval_minutes !== SCAN_INTERVAL_MINUTES) {
        await sb().from('scanner_state').upsert({ id: 1, interval_minutes: SCAN_INTERVAL_MINUTES, seen_urls: s.seen_urls || [], last_scan: s.last_scan });
      }
      return { pending: count || 0, interval_minutes: SCAN_INTERVAL_MINUTES, last_scan: s.last_scan };
    },

    async runScanner() {
      const { data: scannerRow } = await sb().from('scanner_state').select('*').eq('id', 1).maybeSingle();
      const seenUrls = scannerRow?.seen_urls || [];
      const { items, seenUrls: newSeen } = await PAScanner.scanNewsQuick(seenUrls);

      const [{ data: articles }, { data: pending }] = await Promise.all([
        sb().from('articles').select('title,source_url'),
        sb().from('pending_articles').select('title,source_url')
      ]);
      const existing = buildExistingKeys(
        (articles || []).map(a => ({ title: a.title, source_url: a.source_url })),
        (pending || []).map(p => ({ title: p.title, source_url: p.source_url }))
      );

      let found = 0;
      const toInsert = [];
      for (const item of items) {
        if (isDuplicateArticle(item, existing)) continue;
        const row = pendingToRow({ id: 'p-' + Date.now() + '-' + found, ...item, found_at: new Date().toISOString() });
        toInsert.push(row);
        const k = articleKey(item);
        if (k) existing.add(k);
        const t = normTitle(item.title);
        if (t) existing.add('title:' + t);
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
        interval_minutes: SCAN_INTERVAL_MINUTES
      });

      const { count } = await sb().from('pending_articles').select('*', { count: 'exact', head: true });
      return { found, total_pending: count || 0 };
    },

    async approvePending(id) {
      const { data: p, error: e1 } = await sb().from('pending_articles').select('*').eq('id', id).maybeSingle();
      if (e1) throw e1;
      if (!p) throw new Error('Não encontrado');

      const { data: published } = await sb().from('articles').select('title,source_url');
      if (isDuplicateArticle({ title: p.title, source_url: p.source_url }, buildExistingKeys(published || [], []))) {
        await sb().from('pending_articles').delete().eq('id', id);
        throw new Error('duplicate');
      }

      const art = await this.addArticle({
        title: p.title, lead: p.lead, content: p.content, cat: p.cat, status: 'pub',
        img: p.img, video: p.video || '', author: p.author || 'IA Pains Acontece', verified: p.verified, confidence: p.confidence,
        world: p.world || p.cat === 'Mundo', source_url: p.source_url,
        pubISO: p.pub_iso || p.pubISO, date: p.date, timeAgo: p.time_ago || p.timeAgo, source: p.source
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
      const p = normalizePauta(data);
      const { error } = await sb().from('pautas').insert(p);
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
      let articles = await this.getArticles();
      const state = getState();
      if (state.deleted?.length) {
        const hidden = new Set(state.deleted.map(String));
        articles = articles.filter(a => !hidden.has(String(a.id)));
      }
      return { articles, exported_at: new Date().toISOString(), source: 'supabase' };
    },

    importFromFile() {
      return Promise.reject(new Error('Com Supabase ativo, os dados já estão na nuvem. Importação não é necessária.'));
    },

    async purgeAllPublications() {
      try {
        await sb().from('pending_articles').delete().neq('id', '');
        const { error } = await sb().from('articles').delete().gte('id', 0);
        if (error) console.warn('[api] supabase purge:', error.message);
        await sb().from('scanner_state').upsert({
          id: 1, seen_urls: [], last_scan: null, interval_minutes: SCAN_INTERVAL_MINUTES
        });
      } catch (e) {
        console.warn('[api] supabase purge falhou:', e);
      }
      return local.purgeAllPublications();
    }
  };

  async function login(u, p) {
    if (!supabaseConfigured()) return local.login(u, p);
    return remote.login(u, p);
  }

  async function logout() {
    sessionStorage.removeItem('pa_auth_mode');
    cloudOk = null;
    if (supabaseConfigured()) {
      try { await PASupabase.signOut(); } catch {}
    }
  }

  return {
    login,
    logout,
    isSupabaseMode: async () => (await getBackend()).isSupabaseMode(),
    getArticles: async (s) => getArticlesPublic(s),
    getArticle: async (id) => getArticlePublic(id),
    getArticlesAdmin: async (s) => getArticlesAdmin(s),
    fetchArticleFromJson,
    getArticlePublic,
    getArticlesPublic,
    addArticle: async (d) => {
      const r = await (await getBackend()).addArticle(d);
      scheduleAutoSync();
      return r;
    },
    updateArticle: async (id, d) => {
      const r = await (await getBackend()).updateArticle(id, d);
      scheduleAutoSync();
      return r;
    },
    deleteArticle: async (id) => {
      const r = await (await getBackend()).deleteArticle(id);
      scheduleAutoSync();
      return r;
    },
    incrementViews: async (id) => (await getBackend()).incrementViews(id),
    incrementSiteVisits: async () => (await getBackend()).incrementSiteVisits(),
    getSiteVisits: async () => (await getBackend()).getSiteVisits(),
    getPending: async () => (await getBackend()).getPending(),
    scannerStatus: async () => (await getBackend()).scannerStatus(),
    runScanner: async () => (await getBackend()).runScanner(),
    approvePending: async (id) => {
      const r = await (await getBackend()).approvePending(id);
      scheduleAutoSync();
      return r;
    },
    rejectPending: async (id) => (await getBackend()).rejectPending(id),
    resetScanner: async () => {
      const b = await getBackend();
      if (b.resetScanner) return b.resetScanner();
      return local.resetScanner();
    },
    purgeAllPublications: async () => {
      const b = await getBackend();
      const r = b.purgeAllPublications
        ? await b.purgeAllPublications()
        : await local.purgeAllPublications();
      scheduleAutoSync();
      return r;
    },
    aiChat: (msg, ctx) => PAEngine.chat(msg, ctx),
    aiOrganize: (text, hints) => PAEngine.organizeNews(text, hints),
    sendPauta: async (d) => (await getBackend()).sendPauta(d),
    getEvents: async () => (await getBackend()).getEvents(),
    getJobs: async () => (await getBackend()).getJobs(),
    addEvent: async (d) => callBackend('addEvent', d),
    deleteEvent: async (id) => callBackend('deleteEvent', id),
    addJob: async (d) => callBackend('addJob', d),
    deleteJob: async (id) => callBackend('deleteJob', id),
    getAds: async () => callBackend('getAds'),
    addAd: async (d) => callBackend('addAd', d),
    updateAd: async (id, d) => callBackend('updateAd', id, d),
    deleteAd: async (id) => callBackend('deleteAd', id),
    getServices: async () => callBackend('getServices'),
    getServicesAdmin: async () => callBackend('getServicesAdmin'),
    addService: async (d) => callBackend('addService', d),
    updateService: async (id, d) => callBackend('updateService', id, d),
    deleteService: async (id) => callBackend('deleteService', id),
    getRestaurants: async () => callBackend('getRestaurants'),
    getRestaurantsAdmin: async () => callBackend('getRestaurantsAdmin'),
    addRestaurant: async (d) => callBackend('addRestaurant', d),
    updateRestaurant: async (id, d) => callBackend('updateRestaurant', id, d),
    deleteRestaurant: async (id) => callBackend('deleteRestaurant', id),
    getBuses: async () => callBackend('getBuses'),
    getBusesAdmin: async () => callBackend('getBusesAdmin'),
    addBus: async (d) => callBackend('addBus', d),
    updateBus: async (id, d) => callBackend('updateBus', id, d),
    deleteBus: async (id) => (await getBackend()).deleteBus?.(id) ?? Promise.reject(new Error('Não disponível')),
    resolveRole,
    isOwner,
    getAdminAccounts,
    exportForGitHub: async () => (await getBackend()).exportForGitHub(),
    importFromFile: async (f) => (await getBackend()).importFromFile(f),
    getAuthMode: () => sessionStorage.getItem('pa_auth_mode') || 'local'
  };
})();