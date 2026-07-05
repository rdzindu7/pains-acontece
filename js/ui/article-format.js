const PAArticleFormat = (function () {
  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stripTags(raw) {
    if (!raw) return '';
    return raw
      .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractFromHtml(raw) {
    if (!raw || !/<[a-z]/i.test(raw)) return [];
    const h = raw.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
    const blocks = [];
    const paraRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = paraRe.exec(h)) !== null) {
      const t = stripTags(m[1]);
      if (t.length > 35 && !/cookie|newsletter|publicidade|anúncio/i.test(t)) blocks.push(t);
    }
    if (blocks.length >= 2) return blocks;
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    while ((m = liRe.exec(h)) !== null) {
      const t = stripTags(m[1]);
      if (t.length > 20) blocks.push(t);
    }
    return blocks.length >= 2 ? blocks : [];
  }

  function splitSentences(text) {
    return (text.match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g) || [text])
      .map(s => s.trim())
      .filter(s => s.length > 15);
  }

  function splitLongText(text) {
    const parts = [];
    const chunks = text.split(/(?=INFOGRÁFICO\s*[-–—]|FOTOS?:\s|Leia mais[:\s]|Fontes consultadas|✓ Verificação)/i);
    for (let chunk of chunks) {
      chunk = chunk.trim();
      if (!chunk) continue;
      if (/^INFOGRÁFICO/i.test(chunk)) {
        const head = chunk.match(/^(INFOGRÁFICO\s*[-–—]\s*[^.!?]+[.!?]?)/i);
        if (head) {
          parts.push({ type: 'heading', text: head[1].trim() });
          chunk = chunk.slice(head[1].length).trim();
        }
      }
      if (!chunk || chunk.length < 40) continue;
      const sentences = splitSentences(chunk);
      let buf = '';
      for (const sent of sentences) {
        const next = buf ? buf + ' ' + sent : sent;
        if (next.length > 420 && buf.length > 100) {
          parts.push({ type: 'p', text: buf });
          buf = sent;
        } else {
          buf = next;
        }
      }
      if (buf.length > 40) parts.push({ type: 'p', text: buf });
    }
    return parts;
  }

  function textToBlocks(raw) {
    const fromHtml = extractFromHtml(raw);
    if (fromHtml.length) return fromHtml.map(t => ({ type: 'p', text: t }));
    const text = stripTags(raw);
    if (!text) return [];
    if (text.length < 400) return [{ type: 'p', text }];
    return splitLongText(text);
  }

  function blocksToHtml(blocks) {
    return blocks.map(b => {
      if (b.type === 'heading') {
        return `<h3 class="art-subhead">${esc(b.text)}</h3>`;
      }
      return `<p>${esc(b.text)}</p>`;
    }).join('\n');
  }

  function formatPlainText(raw) {
    const blocks = textToBlocks(raw);
    if (!blocks.length) return '';
    return blocksToHtml(blocks);
  }

  function reorganizeContent(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const sourcesBox = temp.querySelector('.art-sources');
    const metaNote = temp.querySelector('.art-meta-note');
    const sourceLink = temp.querySelector('p a[href*="http"]');
    const footerBits = [];

    temp.querySelectorAll('.art-sources, .art-meta-note, .article-gallery').forEach(el => {
      footerBits.push(el.cloneNode(true));
      el.remove();
    });

    const paragraphs = [...temp.querySelectorAll('p')];
    const lists = [...temp.querySelectorAll('ul')];

    const bodyTexts = [];
    paragraphs.forEach(p => {
      const t = p.textContent.trim();
      if (!t) return;
      if (/^Fontes consultadas|^✓ Verificação|matéria verificada pela IA editorial/i.test(t) && t.length < 200) return;
      if (t.length > 500 || (paragraphs.length === 1 && t.length > 280)) {
        bodyTexts.push(...textToBlocks(t));
      } else {
        bodyTexts.push({ type: 'p', text: t });
      }
    });

    let out = bodyTexts.length ? blocksToHtml(bodyTexts) : '';
    lists.forEach(ul => {
      out += '<div class="art-sources"><h4 class="art-sources-title">Fontes consultadas</h4>' + ul.outerHTML + '</div>';
    });
    footerBits.forEach(el => { out += el.outerHTML; });

    if (!out.trim() && html) return html;
    return out;
  }

  function firstParagraph(raw, maxLen) {
    const blocks = textToBlocks(raw);
    const text = (blocks.find(b => b.type === 'p')?.text || stripTags(raw) || '').trim();
    if (!text) return '';
    const limit = maxLen || 220;
    if (text.length <= limit) return text;
    const cut = text.slice(0, limit - 1);
    const last = cut.lastIndexOf(' ');
    return (last > 80 ? cut.slice(0, last) : cut) + '…';
  }

  return {
    esc, stripTags, textToBlocks, blocksToHtml, formatPlainText,
    reorganizeContent, firstParagraph, splitLongText
  };
})();