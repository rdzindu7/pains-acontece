/**
 * Sincronização automática: publicou → Supabase (site lê direto da nuvem).
 * GitHub opcional — desligado quando useGitHubSync === false.
 */
const PAAutoSync = (function () {
  const LS_TOKEN = 'pa_github_sync_token';
  const DEBOUNCE_MS = 2500;
  let timer = null;
  let running = false;

  function githubEnabled() {
    if (PAConfig?.useGitHubSync === false) return false;
    const cfg = PAConfig?.githubSync || {};
    return cfg.enabled !== false;
  }

  function repoInfo() {
    const cfg = PAConfig?.githubSync || {};
    return {
      owner: cfg.owner || 'rdzindu7',
      repo: cfg.repo || 'pains-acontece',
      branch: cfg.branch || 'main',
      path: cfg.path || 'data/articles.json'
    };
  }

  async function getToken() {
    const cfgTok = (PAConfig?.githubSync?.token || '').trim();
    if (cfgTok) return cfgTok;
    try {
      const ls = (localStorage.getItem(LS_TOKEN) || '').trim();
      if (ls) return ls;
    } catch {}
    if (!supabaseConfigured()) return '';
    try {
      const session = await PASupabase.getSession();
      if (!session?.access_token) return '';
      const { data, error } = await PASupabase.getClient()
        .from('publish_config')
        .select('github_token')
        .eq('id', 1)
        .maybeSingle();
      if (!error && data?.github_token) return String(data.github_token).trim();
    } catch {}
    return '';
  }

  function supabaseConfigured() {
    return typeof PASupabase !== 'undefined' && PASupabase.isConfigured();
  }

  async function exportArticles() {
    if (typeof PAAPI === 'undefined' || !PAAPI.exportForGitHub) return [];
    const data = await PAAPI.exportForGitHub();
    return data?.articles || [];
  }

  async function commitToGitHub(articles) {
    const token = await getToken();
    if (!token) return { ok: false, reason: 'no_token' };

    const { owner, repo, branch, path } = repoInfo();
    const headers = {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    let sha;
    try {
      const cur = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        { headers }
      );
      if (cur.ok) sha = (await cur.json()).sha;
    } catch {}

    const body = JSON.stringify(articles, null, 2) + '\n';
    const content = btoa(unescape(encodeURIComponent(body)));

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'auto: sync artigos publicados [PAAutoSync]',
          content,
          sha,
          branch
        })
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.warn('[PAAutoSync] GitHub', res.status, err.slice(0, 200));
      return { ok: false, reason: 'github_error', status: res.status };
    }
    return { ok: true };
  }

  async function triggerWorkflow() {
    const token = await getToken();
    if (!token) return false;
    const { owner, repo } = repoInfo();
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ event_type: 'sync-now' })
      });
      return res.ok || res.status === 204;
    } catch {
      return false;
    }
  }

  async function runNow() {
    if (running) return { ok: false, reason: 'busy' };
    running = true;
    try {
      if (!githubEnabled()) {
        if (typeof PAAutoReload !== 'undefined') PAAutoReload.signalUpdate();
        if (typeof PADialog !== 'undefined' && !(typeof PAAutomation !== 'undefined' && PAAutomation.silent())) {
          PADialog.toast('Salvo na nuvem — o site atualiza automaticamente.', 'success');
        }
        return { ok: true, mode: 'supabase' };
      }
      const articles = await exportArticles();
      const gh = await commitToGitHub(articles);
      if (gh.ok) {
        if (typeof PAAutoReload !== 'undefined') PAAutoReload.signalUpdate();
        if (typeof PADialog !== 'undefined') {
          PADialog.toast('Site atualizado automaticamente no GitHub!', 'success');
        }
        return { ok: true, mode: 'github' };
      }
      await triggerWorkflow();
      if (gh.reason === 'no_token' && typeof PADialog !== 'undefined') {
        PADialog.toast('Salvo na nuvem. O site atualiza em até 5 min (sync automático).', 'info');
      }
      return { ok: true, mode: gh.reason === 'no_token' ? 'supabase_cron' : 'partial' };
    } catch (e) {
      console.warn('[PAAutoSync]', e);
      return { ok: false, reason: e.message };
    } finally {
      running = false;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => { runNow().catch(() => {}); }, DEBOUNCE_MS);
  }

  function saveToken(token) {
    try {
      localStorage.setItem(LS_TOKEN, String(token || '').trim());
      return true;
    } catch {
      return false;
    }
  }

  return { schedule, runNow, saveToken, getToken: () => getToken() };
})();