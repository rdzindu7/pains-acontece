const PARafaela = (function () {
  const PROFILE = {
    id: 'rafaela',
    name: 'Rafaela Costa',
    role: 'Especialista em Divulgação',
    icon: 'fa-bullhorn',
    color: '#e67e22'
  };

  const SITE = (typeof PAConfig !== 'undefined' && PAConfig.siteUrl)
    ? PAConfig.siteUrl.replace(/\/?$/, '/') + ''
    : (location.origin + location.pathname.replace(/\/[^/]*$/, '/')).replace(/\/?$/, '/');
  const SITE_NAME = 'Pains Acontece';

  const SCOPES = {
    pains: {
      label: 'Pains MG',
      country: 'Brasil',
      audience: 'moradores de Pains, bairros e zona rural',
      hashtags: '#PainsMG #PainsAcontece #SudoesteMineiro',
      focus: 'notícias hiperlocais, serviços, agenda e empregos da cidade'
    },
    regiao: {
      label: 'Região MG',
      country: 'Brasil',
      audience: 'Alto São Francisco — Formiga, Piumhi, São Sebastião do Oeste e vizinhas',
      hashtags: '#AltoSaoFrancisco #RegiaoPains #MinasGerais',
      focus: 'cobertura regional, economia, cultura e mobilidade'
    },
    brasil: {
      label: 'Brasil',
      country: 'Brasil',
      audience: 'público nacional interessado em notícias de MG e interior',
      hashtags: '#Brasil #NoticiasMG #InteriorMineiro',
      focus: 'histórias de Minas com relevância nacional'
    },
    mg: {
      label: 'Minas Gerais',
      country: 'Brasil',
      audience: 'mineiros em todo o estado',
      hashtags: '#MinasGerais #MG #PortalDeNoticias',
      focus: 'notícias verificadas do Sudoeste e do estado'
    },
    global: {
      label: 'Global',
      country: 'Internacional',
      audience: 'mineiros no exterior, turistas e diáspora brasileira',
      hashtags: '#Brasil #MinasGerais #ComunidadeMineira',
      focus: 'identidade de Pains e MG com alcance mundial'
    }
  };

  const SHARE_TARGETS = [
    { id: 'wa-grupos-pains', name: 'Grupos WhatsApp Pains', channel: 'whatsapp', scopes: ['pains'], type: 'comunidade' },
    { id: 'wa-regiao', name: 'Grupos WhatsApp Região', channel: 'whatsapp', scopes: ['regiao', 'mg'], type: 'comunidade' },
    { id: 'ig-pains', name: 'Instagram Pains / Stories', channel: 'instagram', scopes: ['pains', 'regiao'], type: 'rede' },
    { id: 'fb-pains', name: 'Facebook Pains Oficial', channel: 'facebook', scopes: ['pains', 'regiao'], type: 'rede' },
    { id: 'fb-brasil', name: 'Facebook Brasil / MG', channel: 'facebook', scopes: ['brasil', 'mg'], type: 'rede' },
    { id: 'x-noticias', name: 'X (Twitter) Notícias', channel: 'twitter', scopes: ['brasil', 'global', 'mg'], type: 'rede' },
    { id: 'portal-formiga', name: 'Portais Formiga / Região', channel: 'facebook', scopes: ['regiao'], type: 'portal' },
    { id: 'radio-local', name: 'Rádios Comunitárias MG', channel: 'whatsapp', scopes: ['pains', 'regiao'], type: 'mídia' },
    { id: 'turismo-mg', name: 'Páginas Turismo MG', channel: 'instagram', scopes: ['mg', 'global'], type: 'turismo' },
    { id: 'comunidade-ext', name: 'Grupos Mineiros no Exterior', channel: 'facebook', scopes: ['global'], type: 'comunidade' }
  ];

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function pickScope(msg) {
    const low = (msg || '').toLowerCase();
    if (/global|mundo|internacional|exterior|diáspora|eua|europa/.test(low)) return 'global';
    if (/brasil|nacional|país|pais/.test(low)) return 'brasil';
    if (/minas|mg\b|mineir/.test(low)) return 'mg';
    if (/regi[aã]o|formiga|piumhi|sudoeste|vizinh/.test(low)) return 'regiao';
    if (/pains|local|cidade/.test(low)) return 'pains';
    return 'pains';
  }

  function pickChannel(msg) {
    const low = (msg || '').toLowerCase();
    if (/instagram|insta|reels|stories/.test(low)) return 'instagram';
    if (/whatsapp|zap|grupo/.test(low)) return 'whatsapp';
    if (/facebook|face|meta/.test(low)) return 'facebook';
    if (/twitter|x\.com|\bx\b/.test(low)) return 'twitter';
    return null;
  }

  function targetsForScope(scope) {
    return SHARE_TARGETS.filter(t => t.scopes.includes(scope));
  }

  function buildPost(scope, channel, article) {
    const s = SCOPES[scope] || SCOPES.pains;
    const link = article
      ? `${SITE}pages/noticia.html?id=${article.id}`
      : SITE;
    const title = article?.title || SITE_NAME;
    const channels = {
      whatsapp: article
        ? `📰 *${title}*\n\n${(article.lead || '').slice(0, 200)}\n\n👉 ${link}\n\n_${SITE_NAME} · ${s.label}_\n${s.hashtags}`
        : `📢 *${SITE_NAME}* — portal de ${s.label}!\n\n✅ ${s.focus}\n✅ Notícias verificadas pela IA\n\n👉 ${SITE}\n\n${s.hashtags}`,
      instagram: article
        ? `📰 ${title}\n\n${(article.quickLead || article.lead || '').slice(0, 280)}\n\n🔗 Link na bio ou stories\n${s.hashtags}\n\n#${(article.cat || 'Noticias').replace(/\s+/g, '')}`
        : `🌿 ${SITE_NAME} | ${s.label}\n\nPara ${s.audience}.\n\n📰 Notícias · 📅 Agenda · 💼 Empregos\n\n${SITE}\n${s.hashtags}`,
      facebook: article
        ? `${title}\n\n${article.lead || ''}\n\nLeia no ${SITE_NAME}: ${link}`
        : `Conheça o ${SITE_NAME} — portal hiperlocal de Pains MG e região!\n\n${s.focus}\n\nAcesse: ${SITE}`,
      twitter: article
        ? `📰 ${title.slice(0, 200)} → ${link} ${s.hashtags}`
        : `📰 ${SITE_NAME} cobre ${s.label}. Portal hiperlocal do Sudoeste Mineiro → ${SITE} ${s.hashtags}`
    };
    return channels[channel] || channels.whatsapp;
  }

  function buildActionPlan(scope, article) {
    const targets = targetsForScope(scope);
    const s = SCOPES[scope] || SCOPES.pains;
    return targets.map(t => ({
      target: t.name,
      channel: t.channel,
      type: t.type,
      text: buildPost(scope, t.channel, article),
      scope: s.label
    }));
  }

  async function getLatestArticles(limit) {
    let arts = [];
    try {
      if (typeof PAStore !== 'undefined') {
        if (!PAStore.getArticles('pub').length && PAStore.init) await PAStore.init().catch(() => {});
        arts = PAStore.getArticles('pub') || [];
      }
      if (!arts.length && typeof PAAPI !== 'undefined') {
        arts = await PAAPI.getArticlesPublic('pub');
      }
    } catch {}
    return arts.slice(0, limit || 5);
  }

  function generate(scope, channel, article) {
    const s = SCOPES[scope] || SCOPES.pains;
    const posts = {
      whatsapp: buildPost(scope, 'whatsapp', article),
      instagram: buildPost(scope, 'instagram', article),
      facebook: buildPost(scope, 'facebook', article),
      twitter: buildPost(scope, 'twitter', article)
    };
    const selected = channel ? posts[channel] : null;
    const targets = targetsForScope(scope);
    const plan = buildActionPlan(scope, article);

    let reply = `**${PROFILE.name}** — campanha **${s.label}** (${s.country})\n\n`;
    reply += `**Público:** ${s.audience}\n\n`;
    if (article) reply += `**Matéria:** ${article.title}\n\n`;
    reply += `**Canais sugeridos (${targets.length}):** ${targets.map(t => t.name).join(' · ')}\n\n`;

    if (selected) {
      reply += `**${channel.charAt(0).toUpperCase() + channel.slice(1)}:**\n\n${esc(selected).replace(/\n/g, '<br>')}`;
    } else {
      reply += `**WhatsApp:**\n${esc(posts.whatsapp).replace(/\n/g, '<br>')}<br><br>`;
      reply += `**Instagram:**\n${esc(posts.instagram).replace(/\n/g, '<br>')}`;
    }

    return {
      agent: PROFILE,
      scope: s.label,
      country: s.country,
      reply,
      posts,
      plan,
      targets,
      action: 'divulgacao'
    };
  }

  async function autoDivulgar(scope, options) {
    const opts = options || {};
    const arts = opts.article
      ? [opts.article]
      : await getLatestArticles(opts.limit || 3);
    if (!arts.length) {
      return {
        agent: PROFILE,
        reply: 'Não há matérias publicadas para divulgar. Publique notícias no painel primeiro.',
        action: 'empty'
      };
    }
    const channel = opts.channel || null;
    const campaigns = arts.map(a => ({
      article: a,
      posts: generate(scope, channel, a)
    }));
    const s = SCOPES[scope] || SCOPES.pains;
    let reply = `**Divulgação automática — ${s.label}**\n\n`;
    reply += `Preparei **${campaigns.length}** campanha(s) para **${targetsForScope(scope).length}** canais:\n\n`;
    campaigns.forEach((c, i) => {
      reply += `${i + 1}. **${c.article.title}** — WhatsApp, Instagram, Facebook\n`;
    });
    reply += `\nUse **Copiar** em cada canal ou **Executar plano** para ver todos os textos.`;
    return { agent: PROFILE, scope: s.label, reply, campaigns, action: 'auto' };
  }

  function process(message) {
    const low = (message || '').toLowerCase();
    const scope = pickScope(message);
    const channel = pickChannel(message);

    if (/auto|autom[aá]tic|divulgar tudo|campanha completa|buscar canais/.test(low)) {
      return autoDivulgar(scope, { channel });
    }
    if (/canais|sites|onde divulgar|plataformas/.test(low)) {
      const targets = targetsForScope(scope);
      const s = SCOPES[scope];
      return {
        agent: PROFILE,
        scope: s.label,
        reply: `**Canais para ${s.label}:**\n\n` +
          targets.map(t => `• **${t.name}** (${t.channel}) — ${t.type}`).join('<br>') +
          `<br><br>Digite **divulgar auto** para gerar textos para todos.`,
        targets,
        action: 'targets'
      };
    }
    return generate(scope, channel, null);
  }

  function greet() {
    return {
      agent: PROFILE,
      reply: `Olá! Sou **${PROFILE.name}**, ${PROFILE.role}.\n\n` +
        `**Escopo:** Pains MG · Região · Minas · Brasil · Global\n\n` +
        `Eu **busco canais** (WhatsApp, Instagram, Facebook, portais) e **crio os textos** de divulgação.\n\n` +
        `Use os botões abaixo ou digite: **divulgar auto pains**, **canais região**, **divulgar matéria**.`,
      action: 'greeting'
    };
  }

  return {
    PROFILE, SCOPES, SHARE_TARGETS, generate, process, greet, pickScope,
    autoDivulgar, buildActionPlan, targetsForScope, getLatestArticles, buildPost
  };
})();