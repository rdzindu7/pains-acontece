const PASupabase = (function () {
  let client = null;

  function isConfigured() {
    const url = PAConfig?.supabaseUrl?.trim();
    const key = PAConfig?.supabaseAnonKey?.trim();
    return !!(url && key && !url.includes('SUA_URL') && !key.includes('SUA_CHAVE'));
  }

  function init() {
    if (!isConfigured() || typeof supabase === 'undefined') return null;
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

  return { isConfigured, init, getClient, signOut, getSession };
})();