/**
 * Imagens de artigos — download na publicação (IA/admin), cache local e limpeza ao apagar.
 * Arquivos finais: assets/images/articles/{id}.jpg (gravados pelo sync Node / GitHub Actions).
 */
const PAArticleImages = (function () {
  const DIR = 'assets/images/articles/';
  const DB_NAME = 'pa_article_images_v1';
  const STORE = 'blobs';
  const LS_PURGE = 'pa_images_purge_queue_v1';
  let dbPromise = null;

  function isPages() {
    return /\/pages\//i.test(location.pathname);
  }

  function prefix() {
    return isPages() ? '../' : '';
  }

  function isLocalPath(url) {
    return !!(url && /assets\/images\/articles\//i.test(String(url)));
  }

  function isRemote(url) {
    return !!(url && /^https?:\/\//i.test(String(url)));
  }

  function extFrom(url) {
    const m = String(url || '').match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
    if (!m) return 'jpg';
    const e = m[1].toLowerCase();
    return e === 'jpeg' ? 'jpg' : e;
  }

  function localRelPath(id, ext) {
    return DIR + String(id) + '.' + (ext || 'jpg');
  }

  function displayPath(article) {
    const id = article?.id;
    if (!id) return '';
    const ext = extFrom(article.img_source || article.img || '');
    if (isLocalPath(article.img)) {
      const rel = article.img.replace(/^\.\.\//, '');
      return prefix() + rel;
    }
    return prefix() + localRelPath(id, ext);
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function idbSave(id, blob) {
    const db = await openDb();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, String(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(id) {
    const db = await openDb();
    if (!db) return null;
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(String(id));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function idbDelete(id) {
    const db = await openDb();
    if (!db) return;
    return new Promise(resolve => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(String(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  function loadPurgeQueue() {
    try { return JSON.parse(localStorage.getItem(LS_PURGE) || '[]'); } catch { return []; }
  }

  function savePurgeQueue(list) {
    try { localStorage.setItem(LS_PURGE, JSON.stringify([...new Set(list)])); } catch {}
  }

  function queuePurge(id) {
    const q = loadPurgeQueue();
    q.push(String(id));
    savePurgeQueue(q);
  }

  async function downloadBlob(url) {
    const tries = [
      url,
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
      'https://corsproxy.io/?' + encodeURIComponent(url)
    ];
    for (const u of tries) {
      try {
        const res = await fetch(u, { signal: AbortSignal.timeout(20000) });
        if (!res.ok) continue;
        const blob = await res.blob();
        if (blob.size > 400) return blob;
      } catch {}
    }
    return null;
  }

  async function prepareForPublish(data) {
    const id = data.id || Date.now();
    const source = data.img_source || (isRemote(data.img) ? data.img : '');
    const ext = extFrom(source || data.img);
    const out = { ...data, id };

    if (source && isRemote(source)) out.img_source = source;
    else if (data.img && data.img.startsWith('data:')) out.img_source = data.img;

    out.img = localRelPath(id, ext);

    const toFetch = source && isRemote(source) ? source : (data.img?.startsWith('data:') ? data.img : '');
    if (toFetch) {
      const blob = await downloadBlob(toFetch);
      if (blob) await idbSave(String(id), blob);
    }

    return out;
  }

  async function removeForArticle(id, art) {
    const sid = String(id);
    await idbDelete(sid);
    queuePurge(sid);
    if (art?.img && isLocalPath(art.img)) queuePurge(sid);
  }

  async function purgeAll(articles) {
    for (const a of articles || []) {
      await removeForArticle(a.id, a);
    }
  }

  function onImgError(img) {
    if (!img || img.dataset.paImgRetry === '2') return;
    const source = img.dataset.imgSource;
    const aid = img.dataset.articleId;
    const cat = img.dataset.cat || '';

    if (source && img.src !== source && img.dataset.paImgRetry !== '1') {
      img.dataset.paImgRetry = '1';
      img.src = source;
      return;
    }

    if (aid) {
      img.dataset.paImgRetry = '2';
      idbGet(aid).then(blob => {
        if (blob) {
          img.src = URL.createObjectURL(blob);
          return;
        }
        if (typeof PAPainsMedia !== 'undefined') img.src = PAPainsMedia.pick(cat);
      });
      return;
    }

    if (typeof PAPainsMedia !== 'undefined') img.src = PAPainsMedia.pick(cat);
  }

  function imgHtml(article, extra) {
    const src = displayPath(article);
    const source = (article.img_source || (isRemote(article.img) ? article.img : '') || '').replace(/"/g, '&quot;');
    const cat = (article.cat || '').replace(/"/g, '&quot;');
    const attrs = extra || '';
    return `<img src="${src.replace(/"/g, '&quot;')}" alt="" loading="lazy" data-article-id="${article.id}" data-img-source="${source}" data-cat="${cat}" onerror="PAArticleImages.onImgError(this)"${attrs}/>`;
  }

  function getPurgeQueue() {
    return loadPurgeQueue();
  }

  return {
    prepareForPublish,
    removeForArticle,
    purgeAll,
    onImgError,
    displayPath,
    localRelPath,
    isLocalPath,
    imgHtml,
    getPurgeQueue,
    queuePurge
  };
})();