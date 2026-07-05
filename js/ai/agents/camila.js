const PACamila = (function () {
  const PROFILE = {
    id: 'camila',
    name: 'Camila Rocha',
    role: 'Editora-Chefe',
    icon: 'fa-pen-nib',
    color: '#c9a227'
  };

  function pubTag(item) {
    if (item.date && item.timeAgo) return ` _${item.date} · ${item.timeAgo}_`;
    if (item.date) return ` _${item.date}_`;
    if (typeof PAScanner !== 'undefined' && item.pubISO) {
      const d = new Date(item.pubISO);
      if (!isNaN(d.getTime())) return ` _${PAScanner.formatPubLabel(d, item.pubISO)}_`;
    }
    return '';
  }

  function formatLines(published, headlines) {
    const lines = [];
    if (published.length) {
      lines.push('**No portal (mais recentes):**');
      published.slice(0, 5).forEach((a, i) => {
        lines.push(`${i + 1}. **${a.title}** (${a.cat})${a.verified ? ' ✓' : ''}${pubTag(a)}`);
      });
    }
    if (headlines.length) {
      lines.push('', '**Fontes monitoradas (últimos 2 dias):**');
      headlines.slice(0, 5).forEach((h, i) => {
        const when = h.pubDate && typeof PAScanner !== 'undefined'
          ? PAScanner.formatPubLabel(h.pubDate, h.pubDate.toISOString?.())
          : '';
        lines.push(`${i + 1}. ${h.title} — _${h.source}_${when ? ' · ' + when : ''}`);
      });
    }
    return lines;
  }

  function present(lucasData, classification) {
    const { published, headlines, verification, query, feedsLoaded } = lucasData;
    const v = verification || {};
    const lines = formatLines(published || [], headlines || []);

    if (!published?.length && !headlines?.length) {
      if (feedsLoaded === 0) {
        return {
          agent: PROFILE,
          reply: 'Lucas não conseguiu acessar os feeds agora. Tente **buscar** em instantes — a varredura será automática.',
          action: 'scan',
          verification: v,
          autoScan: true
        };
      }
      return {
        agent: PROFILE,
        reply: `Não localizei matérias específicas para "${query}". Posso iniciar uma **varredura completa** automaticamente.`,
        action: 'search_empty',
        verification: v,
        autoScan: true
      };
    }

    const intro = /pains/i.test(query)
      ? 'Segue o que nossa equipe encontrou sobre **Pains MG**:'
      : 'Com base na verificação de fontes:';

    return {
      agent: PROFILE,
      reply: `${intro}\n\n${lines.join('\n')}\n\n_Confiança: ${v.confidence || 0}% · ${v.sources?.length || 0} fonte(s) · revisado por ${PROFILE.name}_`,
      action: classification?.intent === 'question' ? 'answer' : 'present',
      verification: v,
      articles: published,
      headlines
    };
  }

  function presentVerify(lucasData) {
    const v = lucasData.verification || {};
    const src = v.sources?.length
      ? v.sources.map(s => `• ${s.title} (${s.source})`).join('\n')
      : 'Nenhuma correspondência nas fontes.';
    return {
      agent: PROFILE,
      reply: `${v.message || 'Verificação concluída.'}\n\n**Fontes:**\n${src}\n\n— ${PROFILE.name}`,
      action: 'verify',
      verification: v
    };
  }

  function presentScan(lucasData) {
    const pub = lucasData.scan?.published || 0;
    const scanned = lucasData.scan?.scanned || 0;
    const skipped = lucasData.scan?.skipped;
    if (skipped) {
      return {
        agent: PROFILE,
        reply: 'Varredura recente já realizada. As matérias do portal estão atualizadas.',
        action: 'scan_done',
        verification: lucasData.verification
      };
    }
    return {
      agent: PROFILE,
      reply: pub
        ? `✓ **${pub}** matéria(s) dos últimos 2 dias publicada(s) (${scanned} analisadas por Lucas). Datas de divulgação preservadas.`
        : `Varredura concluída (${scanned} itens, janela de 2 dias). Nenhuma matéria nova aprovada — portal já verificado.`,
      action: 'scan_done',
      verification: lucasData.verification,
      published: pub
    };
  }

  async function organize(text, lucasData, hints) {
    if (typeof PAEngine === 'undefined') {
      return { agent: PROFILE, reply: 'Motor editorial indisponível.', action: 'error' };
    }
    const article = await PAEngine.organizeNews(text, hints || {});
    const src = article.verification?.sources?.slice(0, 3).map(s => `• ${s.title}`).join('\n') || '';
    return {
      agent: PROFILE,
      reply: article.verified
        ? `✓ **Verificado** (${article.confidence}%)!\n\n**Título:** ${article.title}\n\n**Lead:** ${article.lead}\n\n**Categoria:** ${article.cat}${src ? '\n\n**Fontes:**\n' + src : ''}\n\n— ${PROFILE.name}`
        : `Matéria organizada (${article.confidence}%).\n\n**Título:** ${article.title}\n\n**Lead:** ${article.lead}\n\n**Categoria:** ${article.cat}`,
      action: 'organize',
      article,
      verification: article.verification
    };
  }

  return { PROFILE, present, presentVerify, presentScan, organize };
})();