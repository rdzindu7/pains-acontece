/**
 * Download e limpeza de imagens de artigos → assets/images/articles/
 */
import { mkdirSync, readdirSync, unlinkSync, writeFileSync, existsSync, statSync } from 'fs';
import { dirname, join, extname } from 'path';

export const ARTICLES_IMG_DIR = 'assets/images/articles';

export function isLocalImgPath(url) {
  return !!(url && /assets\/images\/articles\//i.test(String(url)));
}

export function isRemoteImg(url) {
  return !!(url && /^https?:\/\//i.test(String(url)));
}

export function isBundledAsset(url) {
  return !!(url && String(url).startsWith('assets/images/') && !String(url).includes('articles/'));
}

export function extFromUrl(url, contentType) {
  if (contentType) {
    if (/jpeg|jpg/i.test(contentType)) return 'jpg';
    if (/png/i.test(contentType)) return 'png';
    if (/webp/i.test(contentType)) return 'webp';
    if (/gif/i.test(contentType)) return 'gif';
  }
  const m = String(url || '').match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  if (!m) return 'jpg';
  const e = m[1].toLowerCase();
  return e === 'jpeg' ? 'jpg' : e;
}

export function localImgRelPath(id, ext = 'jpg') {
  return `${ARTICLES_IMG_DIR}/${String(id)}.${ext}`;
}

export function localImgAbsPath(root, id, ext = 'jpg') {
  return join(root, localImgRelPath(id, ext));
}

export function imageSource(article) {
  if (!article) return '';
  if (article.img_source && (isRemoteImg(article.img_source) || isBundledAsset(article.img_source))) return article.img_source;
  if (isRemoteImg(article.img)) return article.img;
  if (isBundledAsset(article.img)) return article.img;
  return '';
}

export async function fetchImageBuffer(url, root) {
  if (isBundledAsset(url) && root) {
    try {
      const { readFileSync: read } = await import('fs');
      const abs = join(root, url.replace(/^\//, ''));
      if (existsSync(abs)) {
        const buf = read(abs);
        if (buf.length > 100) return { buf, contentType: 'image/png' };
      }
    } catch {}
  }
  const attempts = [
    url,
    'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
    'https://corsproxy.io/?' + encodeURIComponent(url)
  ];
  for (const u of attempts) {
    try {
      const res = await fetch(u, {
        headers: { 'User-Agent': 'PainsAcontece-ImageSync/1.0', Accept: 'image/*,*/*' },
        signal: AbortSignal.timeout(25000)
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 400) continue;
      return { buf, contentType: res.headers.get('content-type') || '' };
    } catch {}
  }
  return null;
}

export async function ensureArticleImage(article, root) {
  const id = String(article.id);
  if (!id) return article;

  const dir = join(root, ARTICLES_IMG_DIR);
  mkdirSync(dir, { recursive: true });

  const existingExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].find(ext => {
    const p = localImgAbsPath(root, id, ext === 'jpeg' ? 'jpg' : ext);
    return existsSync(p) && statSync(p).size > 400;
  });

  if (existingExt && isLocalImgPath(article.img)) {
    const ext = existingExt === 'jpeg' ? 'jpg' : existingExt;
    return { ...article, img: localImgRelPath(id, ext), img_source: article.img_source || imageSource(article) || undefined };
  }

  const source = imageSource(article);
  if (!source) {
    if (isLocalImgPath(article.img)) return article;
    return article;
  }

  let fetched = await fetchImageBuffer(source, root);
  if (!fetched) {
    const logo = join(root, 'assets/images/pains-acontece-logo.png');
    if (existsSync(logo)) {
      const { readFileSync: read } = await import('fs');
      fetched = { buf: read(logo), contentType: 'image/png' };
    }
  }
  if (!fetched) {
    return { ...article, img_source: source };
  }

  const ext = extFromUrl(source, fetched.contentType);
  const rel = localImgRelPath(id, ext);
  const abs = join(root, rel);
  writeFileSync(abs, fetched.buf);
  return { ...article, img: rel, img_source: source };
}

export async function processArticleImages(articles, root) {
  const list = [...(articles || [])];
  let downloaded = 0;
  for (let i = 0; i < list.length; i++) {
    const before = list[i].img;
    list[i] = await ensureArticleImage(list[i], root);
    if (list[i].img !== before && isLocalImgPath(list[i].img)) downloaded++;
  }
  return { articles: list, downloaded };
}

export function pruneArticleImages(articles, root) {
  const dir = join(root, ARTICLES_IMG_DIR);
  if (!existsSync(dir)) return { removed: 0 };
  const valid = new Set((articles || []).map(a => String(a.id)));
  let removed = 0;
  for (const file of readdirSync(dir)) {
    const m = file.match(/^(\d+)\.(jpe?g|png|webp|gif)$/i);
    if (!m) continue;
    if (!valid.has(m[1])) {
      try {
        unlinkSync(join(dir, file));
        removed++;
      } catch {}
    }
  }
  return { removed };
}