const PAWeather = (function () {
  const LAT = -20.371;
  const LON = -45.726;
  const API = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FSao_Paulo&forecast_days=6`;

  const WMO = {
    0: { icon: '☀️', label: 'Céu limpo' },
    1: { icon: '🌤️', label: 'Quase limpo' },
    2: { icon: '⛅', label: 'Parcialmente nublado' },
    3: { icon: '☁️', label: 'Nublado' },
    45: { icon: '🌫️', label: 'Neblina' },
    48: { icon: '🌫️', label: 'Neblina' },
    51: { icon: '🌦️', label: 'Garoa leve' },
    53: { icon: '🌦️', label: 'Garoa' },
    55: { icon: '🌧️', label: 'Garoa forte' },
    61: { icon: '🌧️', label: 'Chuva leve' },
    63: { icon: '🌧️', label: 'Chuva' },
    65: { icon: '🌧️', label: 'Chuva forte' },
    71: { icon: '🌨️', label: 'Neve' },
    80: { icon: '🌦️', label: 'Pancadas leves' },
    81: { icon: '🌧️', label: 'Pancadas' },
    95: { icon: '⛈️', label: 'Tempestade' }
  };

  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function wmo(code) {
    return WMO[code] || WMO[2];
  }

  function widgetHtml(data, id) {
    const c = data.current;
    const w = wmo(c.weather_code);
    const days = data.daily.time.map((t, i) => ({
      d: DAYS[new Date(t + 'T12:00:00').getDay()],
      ic: wmo(data.daily.weather_code[i]).icon,
      t: Math.round(data.daily.temperature_2m_max[i])
    })).slice(0, 5);

    return `
      <div class="clima-top anim-fade">
        <div>
          <div class="clima-city">Pains, MG</div>
          <div class="clima-temp-big">${Math.round(c.temperature_2m)}°C</div>
          <div class="clima-desc">${w.label}</div>
          <div class="clima-updated" style="font-size:.65rem;color:var(--dim);margin-top:6px">
            <i class="fas fa-sync-alt"></i> Atualizado agora · Open-Meteo
          </div>
        </div>
        <div class="clima-icon-big anim-float">${w.icon}</div>
      </div>
      <div class="clima-grid anim-fade">
        <div class="clima-cell"><span>Sensação</span><strong>${Math.round(c.apparent_temperature)}°C</strong></div>
        <div class="clima-cell"><span>Umidade</span><strong>${c.relative_humidity_2m}%</strong></div>
        <div class="clima-cell"><span>Vento</span><strong>${Math.round(c.wind_speed_10m)} km/h</strong></div>
        <div class="clima-cell"><span>Máx / Mín</span><strong>${Math.round(data.daily.temperature_2m_max[0])}° / ${Math.round(data.daily.temperature_2m_min[0])}°</strong></div>
      </div>
      <div class="clima-forecast anim-fade" id="${id || 'climaForecast'}">
        ${days.map(d => `<div class="fc-day"><div class="d">${d.d}</div><div class="ic">${d.ic}</div><div class="t">${d.t}°</div></div>`).join('')}
      </div>`;
  }

  async function load() {
    const res = await fetch(API, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error('Clima indisponível');
    return res.json();
  }

  async function renderAll() {
    const targets = [
      { sel: '#climaWidgetBody', full: '#climaFullBody' }
    ];
    try {
      const data = await load();
      const html = widgetHtml(data);
      const fullHtml = `
        <div class="clima-full-grid anim-fade">
          ${widgetHtml(data, 'climaForecastFull')}
        </div>
        <p style="font-size:.72rem;color:var(--dim);margin-top:16px;text-align:center">
          Previsão para Pains e região · Coordenadas ${LAT}, ${LON}
        </p>`;
      const w = document.getElementById('climaWidgetBody');
      const f = document.getElementById('climaFullBody');
      if (w) w.innerHTML = html;
      if (f) f.innerHTML = fullHtml;
    } catch {
      const err = '<p style="color:var(--dim);font-size:.82rem;padding:12px 0"><i class="fas fa-cloud"></i> Clima temporariamente indisponível.</p>';
      ['climaWidgetBody', 'climaFullBody'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = err;
      });
    }
  }

  return { renderAll, load };
})();