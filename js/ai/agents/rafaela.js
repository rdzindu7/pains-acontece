const PARafaela = (function () {
  const PROFILE = {
    id: 'rafaela',
    name: 'Rafaela Costa',
    role: 'Especialista em Divulgação',
    icon: 'fa-bullhorn',
    color: '#e67e22'
  };

  const SITE = 'https://rdzindu7.github.io/pains-acontece/';
  const SITE_NAME = 'Pains Acontece';

  const SCOPES = {
    pains: {
      label: 'Pains MG',
      audience: 'moradores de Pains e bairros',
      hashtags: '#PainsMG #PainsAcontece #SudoesteMineiro',
      focus: 'notícias hiperlocais, serviços, agenda e empregos da cidade'
    },
    regiao: {
      label: 'Região',
      audience: 'Alto São Francisco e cidades vizinhas (Formiga, Piumhi, São Sebastião do Oeste)',
      hashtags: '#AltoSaoFrancisco #RegiaoPains #MinasGerais',
      focus: 'cobertura regional, economia, cultura e mobilidade'
    },
    global: {
      label: 'Global',
      audience: 'mineiros no exterior, turistas e público nacional interessado em MG',
      hashtags: '#Brasil #MinasGerais #PortalDeNoticias',
      focus: 'identidade local com alcance nacional e internacional'
    }
  };

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function pickScope(msg) {
    const low = (msg || '').toLowerCase();
    if (/global|mundo|internacional|brasil|nacional|exterior/.test(low)) return 'global';
    if (/regi[aã]o|formiga|piumhi|sudoeste|vizinh/.test(low)) return 'regiao';
    if (/pains|local|cidade/.test(low)) return 'pains';
    return 'pains';
  }

  function buildPost(scope, channel) {
    const s = SCOPES[scope] || SCOPES.pains;
    const channels = {
      whatsapp: `📢 *${SITE_NAME}* — o portal de ${s.label}!\n\n✅ ${s.focus}\n✅ Notícias verificadas\n✅ Agenda, empregos e serviços\n\n👉 ${SITE}\n\n${s.hashtags}`,
      instagram: `🌿 ${SITE_NAME} | ${s.label}\n\nO que importa em ${s.audience} — num só lugar.\n\n📰 Notícias · 📅 Agenda · 💼 Empregos · 🍽️ Gastronomia\n\nLink na bio 👇\n${SITE}\n\n${s.hashtags}`,
      facebook: `Conheça o ${SITE_NAME} — portal hiperlocal de Pains e região!\n\nPara ${s.audience}, reunimos notícias, serviços e oportunidades com curadoria editorial.\n\nAcesse: ${SITE}`,
      twitter: `📰 ${SITE_NAME} cobre ${s.label} com notícias, agenda e empregos. O portal hiperlocal do Sudoeste Mineiro → ${SITE} ${s.hashtags}`
    };
    return channels[channel] || channels.whatsapp;
  }

  function generate(scope, channel) {
    const s = SCOPES[scope] || SCOPES.pains;
    const posts = {
      whatsapp: buildPost(scope, 'whatsapp'),
      instagram: buildPost(scope, 'instagram'),
      facebook: buildPost(scope, 'facebook'),
      twitter: buildPost(scope, 'twitter')
    };
    const selected = channel ? posts[channel] : null;
    return {
      agent: PROFILE,
      scope: s.label,
      reply: `**${PROFILE.name}** — campanha para **${s.label}**\n\n` +
        `**Público:** ${s.audience}\n\n` +
        (selected
          ? `**${channel.charAt(0).toUpperCase() + channel.slice(1)}:**\n\n${esc(selected).replace(/\n/g, '<br>')}`
          : `**WhatsApp:**\n${esc(posts.whatsapp).replace(/\n/g, '<br>')}<br><br>` +
            `**Instagram:**\n${esc(posts.instagram).replace(/\n/g, '<br>')}<br><br>` +
            `**Facebook:**\n${esc(posts.facebook).replace(/\n/g, '<br>')}`),
      posts,
      action: 'divulgacao'
    };
  }

  function process(message) {
    const scope = pickScope(message);
    const low = (message || '').toLowerCase();
    let channel = null;
    if (/instagram|insta/.test(low)) channel = 'instagram';
    else if (/whatsapp|zap/.test(low)) channel = 'whatsapp';
    else if (/facebook|face/.test(low)) channel = 'facebook';
    else if (/twitter|x\.com/.test(low)) channel = 'twitter';
    return generate(scope, channel);
  }

  function greet() {
    return {
      agent: PROFILE,
      reply: `Olá! Sou **${PROFILE.name}**, ${PROFILE.role} do portal.\n\n` +
        `Crio textos de divulgação para:\n• **Pains MG** — comunidade local\n• **Região** — Alto São Francisco\n• **Global** — alcance nacional e internacional\n\n` +
        `Peça campanhas para WhatsApp, Instagram, Facebook ou digite **divulgar pains**, **divulgar região** ou **divulgar global**.`,
      action: 'greeting'
    };
  }

  return { PROFILE, SCOPES, generate, process, greet, pickScope };
})();