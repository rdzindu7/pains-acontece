const PASupabase = (function () {
  let client = null;

  function isConfigured() {
    const url = PAConfig?.supabaseUrl?.trim();
    const key = PAConfig?.supabaseAnonKey?.trim();
    return !!(url && key && !url.includes('SUA_URL') && !key.includes('SUA_CHAVE'));
  }

  function libReady() {
    return typeof supabase !== 'undefined';
  }

  function init() {
    if (!isConfigured() || !libReady()) return null;
    if (!client) {
      client = supabase.createClient(PAConfig.supabaseUrl.trim(), PAConfig.supabaseAnonKey.trim(), {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return client;
  }

  function getClient() {
    return client || init();
  }

  async function signOut() {
    const c = getClient();
    if (c) await c.auth.signOut();
  }

  async function getSession() {
    const c = getClient();
    if (!c) return null;
    const { data } = await c.auth.getSession();
    return data.session;
  }

  async function signInWithGoogle(redirectTo) {
    const c = getClient();
    if (!c) return { ok: false, error: 'Supabase não configurado' };
    const { data, error } = await c.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'consent' } }
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  }

  async function handleAuthCallback() {
    const c = getClient();
    if (!c) return null;
    const { data, error } = await c.auth.getSession();
    if (error) return null;
    return data.session;
  }

  function onAuthStateChange(cb) {
    const c = getClient();
    if (!c) return () => {};
    const { data } = c.auth.onAuthStateChange((_event, session) => cb(session));
    return () => data?.subscription?.unsubscribe?.();
  }

  async function ensureReady(ms) {
    if (!isConfigured()) return null;
    if (libReady()) return getClient();
    const deadline = Date.now() + (ms || 8000);
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 50));
      if (libReady()) return init();
    }
    return null;
  }

  return { isConfigured, libReady, init, getClient, ensureReady, signOut, getSession, signInWithGoogle, handleAuthCallback, onAuthStateChange };
})();