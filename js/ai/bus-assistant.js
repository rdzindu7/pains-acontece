/**
 * PABusIA — busca rigorosa de ônibus Pains e região (Alto São Francisco / Sudoeste MG)
 */
const PABusIA = (function () {
  const MIN_SCORE = 14;
  const DAY_ALIASES = {
    seg: ['segunda', 'seg', '2a', '2ª'],
    ter: ['terça', 'terca', 'ter', '3a', '3ª'],
    qua: ['quarta', 'qua', '4a', '4ª'],
    qui: ['quinta', 'qui', '5a', '5ª'],
    sex: ['sexta', 'sex', '6a', '6ª'],
    sab: ['sábado', 'sabado', 'sab', 'sáb'],
    dom: ['domingo', 'dom']
  };

  const CITIES = {
    pains: { label: 'Pains MG', aliases: ['pains', 'pains mg', 'pains-mg', 'painsminas'] },
    formiga: { label: 'Formiga MG', aliases: ['formiga', 'formiga mg'] },
    piumhi: { label: 'Piumhi MG', aliases: ['piumhi', 'piumhi mg'] },
    bambui: { label: 'Bambuí MG', aliases: ['bambui', 'bambuí', 'bambui mg'] },
    dores_do_indaia: { label: 'Dores do Indaiá MG', aliases: ['dores do indaia', 'dores do indaiá', 'dores', 'dores indaia'] },
    sao_sebastiao_do_oeste: { label: 'São Sebastião do Oeste MG', aliases: ['sao sebastiao do oeste', 'são sebastião do oeste', 'sao sebastiao', 'são sebastião'] },
    cristais: { label: 'Cristais MG', aliases: ['cristais', 'cristais mg'] },
    medeiros: { label: 'Medeiros MG', aliases: ['medeiros', 'medeiros mg'] },
    pedra_do_indaia: { label: 'Pedra do Indaiá MG', aliases: ['pedra do indaia', 'pedra do indaiá', 'pedra indaia'] },
    divinopolis: { label: 'Divinópolis MG', aliases: ['divinopolis', 'divinópolis', 'divinopolis mg'] },
    belo_horizonte: { label: 'Belo Horizonte MG', aliases: ['belo horizonte', 'bh', 'beagá', 'beaga', 'belo horizonte mg'] }
  };

  let routesCache = null;

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function norm(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cityIdsByLength() {
    return Object.keys(CITIES).sort((a, b) => b.length - a.length);
  }

  function resolveCity(text) {
    const n = norm(text);
    if (!n) return null;
    for (const id of cityIdsByLength()) {
      const c = CITIES[id];
      if (n === id.replace(/_/g, ' ') || n === id) return id;
      for (const alias of c.aliases) {
        const a = norm(alias);
        if (n === a || n.includes(a) && a.length >= 4) return id;
      }
    }
    for (const id of cityIdsByLength()) {
      const label = norm(CITIES[id].label);
      if (n.includes(label) || label.includes(n)) return id;
    }
    return null;
  }

  function findCitiesInText(text) {
    const n = norm(text);
    const found = [];
    for (const id of cityIdsByLength()) {
      const c = CITIES[id];
      const patterns = [id.replace(/_/g, ' '), ...c.aliases.map(norm)];
      for (const p of patterns) {
        if (p.length >= 3 && n.includes(p) && !found.includes(id)) {
          found.push(id);
          break;
        }
      }
    }
    return found;
  }

  function parseDay(text) {
    const n = norm(text);
    for (const [code, aliases] of Object.entries(DAY_ALIASES)) {
      if (aliases.some(a => n.includes(norm(a)))) return code;
    }
    if (/hoje/.test(n)) {
      const d = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      return d[new Date().getDay()];
    }
    if (/amanha|amanhã/.test(n)) {
      const d = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      return d[(new Date().getDay() + 1) % 7];
    }
    return null;
  }

  function parseQuery(text) {
    const raw = (text || '').trim();
    const n = norm(raw);
    let origin = null;
    let dest = null;

    const dePara = raw.match(/(?:de|saindo\s+de)\s+([^,]+?)\s+(?:para|ate|até|a|→|->|-)\s+([^,?.\n]+)/i);
    if (dePara) {
      origin = resolveCity(dePara[1]);
      dest = resolveCity(dePara[2]);
    }

    if (!origin || !dest) {
      const arrow = raw.match(/([a-záàâãéèêíïóôõöúçñ\s]+?)\s*(?:→|->|-|–)\s*([a-záàâãéèêíïóôõöúçñ\s]+)/i);
      if (arrow) {
        origin = origin || resolveCity(arrow[1]);
        dest = dest || resolveCity(arrow[2]);
      }
    }

    if (!origin || !dest) {
      const para = raw.match(/(?:para|ate|até|a)\s+([^,?.]+)/i);
      if (para) {
        dest = dest || resolveCity(para[1]);
        if (!origin) {
          const cities = findCitiesInText(raw.replace(para[0], ''));
          origin = cities.find(c => c !== dest) || null;
        }
      }
    }

    const cities = findCitiesInText(raw);
    if (!origin && cities.length >= 1) origin = cities[0];
    if (!dest && cities.length >= 2) dest = cities.find(c => c !== origin) || null;

    if (/pains/.test(n) && !origin && !dest) origin = 'pains';

    return {
      raw,
      origin,
      dest,
      day: parseDay(raw),
      cities,
      isBusQuery: /onibus|ônibus|bus|linha|horario|horário|transporte|rodoviaria|rodoviária|embarque|passagem/.test(n)
    };
  }

  function scoreRoute(route, q) {
    let score = 0;
    const { origin, dest, day } = q;

    if (origin && dest) {
      if (route.origin === origin && route.destination === dest) score += 20;
      else if (route.origin === dest && route.destination === origin) score += 6;
      else return 0;
    } else if (origin) {
      if (route.origin === origin || route.destination === origin) score += 12;
      else return 0;
    } else if (dest) {
      if (route.origin === dest || route.destination === dest) score += 12;
      else return 0;
    } else if (q.isBusQuery) {
      if (route.origin === 'pains' || route.destination === 'pains') score += 8;
      else score += 3;
    } else {
      return 0;
    }

    if (day && route.schedules) {
      const hasDay = route.schedules.some(s => s.days && s.days.includes(day));
      if (hasDay) score += 4;
      else score -= 6;
    }

    if (route.active !== false) score += 2;
    return score;
  }

  function formatDays(days) {
    const map = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };
    return (days || []).map(d => map[d] || d).join(', ');
  }

  function formatSchedules(route, dayFilter) {
    const blocks = [];
    (route.schedules || []).forEach(s => {
      if (dayFilter && s.days && !s.days.includes(dayFilter)) return;
      const times = (s.times || []).join(', ');
      blocks.push(`<strong>${formatDays(s.days)}</strong>: ${esc(times)}`);
    });
    return blocks.join('<br>') || 'Sem horários cadastrados';
  }

  function formatRoute(r, dayFilter) {
    const o = CITIES[r.origin]?.label || r.origin;
    const d = CITIES[r.destination]?.label || r.destination;
    return `
      <div class="pabus-result">
        <div class="pabus-route-head">
          <i class="fas fa-bus"></i>
          <strong>${esc(r.company)}</strong>
          <span class="pabus-arrow">${esc(o)} → ${esc(d)}</span>
        </div>
        <div class="pabus-meta">
          ${r.duration_min ? `<span><i class="fas fa-clock"></i> ~${r.duration_min} min</span>` : ''}
          ${r.price_ref ? `<span><i class="fas fa-ticket-alt"></i> ${esc(r.price_ref)}</span>` : ''}
          ${r.phone ? `<span><i class="fas fa-phone"></i> ${esc(r.phone)}</span>` : ''}
        </div>
        <div class="pabus-stops">
          <span><i class="fas fa-map-marker-alt"></i> ${esc(r.stop_origin || o)}</span>
          <span><i class="fas fa-flag-checkered"></i> ${esc(r.stop_destination || d)}</span>
        </div>
        <div class="pabus-times">${formatSchedules(r, dayFilter)}</div>
        ${r.notes ? `<p class="pabus-note">${esc(r.notes)}</p>` : ''}
      </div>`;
  }

  async function loadRoutes() {
    if (routesCache) return routesCache;
    if (typeof PAAPI !== 'undefined' && PAAPI.getBuses) {
      routesCache = await PAAPI.getBuses();
      return routesCache;
    }
    const root = typeof PAAPI !== 'undefined' ? PAAPI.siteRoot?.() : new URL('./', location.href);
    const url = new URL('data/buses.json', root).href;
    const res = await fetch(url);
    routesCache = res.ok ? await res.json() : [];
    return routesCache;
  }

  function getRegionListHtml() {
    return Object.entries(CITIES)
      .map(([, c]) => `• ${esc(c.label)}`)
      .join('<br>');
  }

  async function search(query) {
    const q = parseQuery(query);
    const routes = await loadRoutes();
    const active = routes.filter(r => r.active !== false);

    const unknown = q.cities.filter(c => !CITIES[c]);
    if (unknown.length) {
      return {
        ok: false,
        strict: true,
        message: `A busca é <strong>restrita à região de Pains</strong>. Não atendemos: <em>${esc(unknown.join(', '))}</em>.`,
        hint: getRegionListHtml()
      };
    }

    if (!q.isBusQuery && !q.origin && !q.dest && q.cities.length === 0) {
      return {
        ok: false,
        strict: true,
        message: 'Informe origem e destino para busca rigorosa. Exemplo: <em>ônibus de Pains para Formiga</em> ou <em>Pains - Piumhi segunda</em>.',
        hint: getRegionListHtml()
      };
    }

    const scored = active
      .map(r => ({ route: r, score: scoreRoute(r, q) }))
      .filter(x => x.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);

    if (!scored.length) {
      let msg = 'Nenhuma linha encontrada com os critérios rigorosos informados.';
      if (q.origin && q.dest) {
        msg = `Sem linha cadastrada <strong>${esc(CITIES[q.origin]?.label)} → ${esc(CITIES[q.dest]?.label)}</strong>.`;
      } else if (q.origin) {
        msg = `Nenhuma linha saindo de <strong>${esc(CITIES[q.origin]?.label)}</strong> com esses filtros.`;
      }
      return {
        ok: false,
        strict: true,
        message: msg,
        hint: 'Cidades atendidas:<br>' + getRegionListHtml()
      };
    }

    const dayFilter = q.day;
    const results = scored.slice(0, 6).map(x => formatRoute(x.route, dayFilter));

    let intro = '';
    if (q.origin && q.dest) {
      intro = `Encontrei <strong>${scored.length}</strong> linha(s) rigorosas para <strong>${esc(CITIES[q.origin]?.label)} → ${esc(CITIES[q.dest]?.label)}</strong>`;
      if (dayFilter) intro += ` (${esc(DAY_ALIASES[dayFilter]?.[0] || dayFilter)})`;
      intro += ':';
    } else if (q.origin) {
      intro = `Linhas envolvendo <strong>${esc(CITIES[q.origin]?.label)}</strong>:`;
    } else {
      intro = 'Linhas da região de Pains:';
    }

    return {
      ok: true,
      strict: true,
      count: scored.length,
      intro,
      html: results.join(''),
      query: q
    };
  }

  function formatReply(result) {
    if (!result.ok) {
      return `${result.message}<br><br><span style="font-size:.72rem;color:rgba(255,255,255,.45)">${result.hint || ''}</span>`;
    }
    return `${result.intro}<br><br>${result.html}<br><br><span style="font-size:.65rem;color:rgba(255,255,255,.4)">Busca rigorosa · Confirme horários com a viação antes de viajar.</span>`;
  }

  function isBusIntent(text) {
    const n = norm(text);
    return /onibus|ônibus|horario|horário|linha|rodoviaria|rodoviária|transporte|passagem|embarque|bus\b/.test(n)
      || (findCitiesInText(text).length >= 1 && /para|ate|até|de\s|->|→|-/.test(n));
  }

  function listCities() {
    return Object.entries(CITIES).map(([id, c]) => ({ id, label: c.label }));
  }

  function invalidateCache() {
    routesCache = null;
  }

  return {
    search,
    formatReply,
    isBusIntent,
    parseQuery,
    listCities,
    CITIES,
    MIN_SCORE,
    loadRoutes,
    invalidateCache
  };
})();