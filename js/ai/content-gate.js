const PAContentGate = (function () {
  const LS_AUDITED = 'pa_deep_audited_v1';
  const MAX_AUDIT_PER_SESSION = 12;

  function alreadyAudited(id) {
    try {
      const ids = JSON.parse(localStorage.getItem(LS_AUDITED) || '[]');
      return ids.includes(String(id));
    } catch { return false; }
  }

  function markAudited(id) {
    try {
      const ids = JSON.parse(localStorage.getItem(LS_AUDITED) || '[]');
      if (!ids.includes(String(id))) {
        ids.push(String(id));
        localStorage.setItem(LS_AUDITED, JSON.stringify(ids.slice(-200)));
      }
    } catch {}
  }

  function articleToItem(art) {
    return {
      title: art.title,
      summary: art.lead || '',
      link: art.source_url || '',
      source: art.source || 'portal',
      pubDate: new Date(),
      image: art.img
    };
  }

  async function auditArticle(art, allFeeds) {
    if (art.deepVerified && art.confidence >= 58) return { ...art, approved: true };
    const item = articleToItem(art);
    const deep = await PAScanner.deepVerifyPublication(item, allFeeds, art.cat);
    if (!deep.approved) return { ...art, approved: false };
    return {
      ...art,
      approved: true,
      lead: deep.lead || art.lead,
      content: deep.content || art.content,
      img: deep.img || art.img,
      verified: deep.verified,
      confidence: deep.confidence,
      deepVerified: true,
      audit: deep.audit,
      source_url: deep.source_url || art.source_url
    };
  }

  async function gate(articles, onProgress) {
    const allFeeds = await PAScanner.getFeedItems?.(false) || [];
    const passed = [];
    let audited = 0;

    const withFlag = articles.filter(a => a.deepVerified && a.confidence >= 58);
    const needsAudit = articles.filter(a => !a.deepVerified || a.confidence < 58);

    withFlag.forEach(a => passed.push({ ...a, approved: true }));

    for (const art of needsAudit) {
      if (audited >= MAX_AUDIT_PER_SESSION) {
        if (art.verified && art.confidence >= 60) passed.push({ ...art, approved: true });
        continue;
      }
      if (alreadyAudited(art.id) && art.verified) {
        passed.push({ ...art, approved: true });
        continue;
      }
      onProgress?.(audited + 1, needsAudit.length, art.title);
      const result = await auditArticle(art, allFeeds);
      audited++;
      markAudited(art.id);
      if (result.approved) {
        passed.push(result);
        try {
          if (typeof PAAPI !== 'undefined' && PAAPI.updateArticle) {
            await PAAPI.updateArticle(art.id, {
              lead: result.lead, content: result.content, img: result.img,
              verified: result.verified, confidence: result.confidence,
              deepVerified: true
            });
          }
        } catch {}
      }
    }

    return passed.sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  return { gate, auditArticle };
})();