/**
 * JerryWeatherAPI - Embed Script v2.0
 *
 * Usage in any blog/website:
 *   <div id="jerry-weather"></div>
 *   <script src="https://your-api.vercel.app/embed.js"></script>
 *
 * Or with custom config:
 *   <div id="my-weather"></div>
 *   <script>
 *     window.JerryWeatherConfig = { container: '#my-weather', apiBase: 'https://your-api.vercel.app' };
 *   </script>
 *   <script src="https://your-api.vercel.app/embed.js"></script>
 *
 * Location strategy:
 *   1. Browser GPS (navigator.geolocation) → precise coordinates, cached 24h
 *   2. Fallback: IP-based geolocation via API (may be inaccurate at city level)
 *
 * The browser will show its native location permission dialog.
 * No custom prompts — clean and non-intrusive.
 */
(function () {
  'use strict';

  var config = Object.assign({
    container: '#jerry-weather',
    apiBase: '',
    cacheKey: 'jerry_weather_coords',
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    geoTimeout: 10000,
  }, window.JerryWeatherConfig || {});

  // Auto-detect API base from script src
  if (!config.apiBase) {
    var scripts = document.querySelectorAll('script[src*="embed.js"]');
    for (var i = 0; i < scripts.length; i++) {
      try {
        config.apiBase = new URL(scripts[i].src).origin;
        break;
      } catch (e) {}
    }
    if (!config.apiBase) config.apiBase = '';
  }

  var container = document.querySelector(config.container);
  if (!container) {
    console.warn('[JerryWeatherAPI] Container not found:', config.container);
    return;
  }

  // ---- Weather icons ----
  var ICONS = {
    0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
    51:'🌦️',53:'🌦️',55:'🌧️',56:'🌧️',57:'🌧️',
    61:'🌦️',63:'🌧️',65:'🌧️',66:'🌧️',67:'🌧️',
    71:'🌨️',73:'🌨️',75:'❄️',77:'🌨️',
    80:'🌦️',81:'🌧️',82:'⛈️',85:'🌨️',86:'❄️',
    95:'⛈️',96:'⛈️',99:'⛈️'
  };
  function icon(code) { return ICONS[code] || '❓'; }

  // ---- Cache helpers ----
  function getCachedCoords() {
    try {
      var raw = localStorage.getItem(config.cacheKey);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (Date.now() - data.timestamp < config.cacheTTL) {
        return { lat: data.lat, lon: data.lon, source: 'cached-gps' };
      }
      localStorage.removeItem(config.cacheKey);
    } catch (e) {}
    return null;
  }

  function cacheCoords(lat, lon) {
    try {
      localStorage.setItem(config.cacheKey, JSON.stringify({
        lat: lat, lon: lon, timestamp: Date.now()
      }));
    } catch (e) {}
  }

  function clearCachedCoords() {
    try { localStorage.removeItem(config.cacheKey); } catch (e) {}
  }

  // ---- Geolocation (browser native) ----
  function getGpsCoords() {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var coords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            source: 'gps'
          };
          cacheCoords(coords.lat, coords.lon);
          resolve(coords);
        },
        function (err) {
          console.log('[JerryWeatherAPI] GPS unavailable:', err.message);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: config.geoTimeout, maximumAge: config.cacheTTL }
      );
    });
  }

  // ---- API call ----
  function fetchWeather(coords) {
    var url = config.apiBase + '/api/weather';
    if (coords && coords.lat != null) {
      url += '?lat=' + encodeURIComponent(coords.lat) + '&lon=' + encodeURIComponent(coords.lon);
    }
    return fetch(url).then(function (r) { return r.json(); });
  }

  // ---- Render ----
  function render(data, locationSource) {
    if (!data.success) {
      container.innerHTML =
        '<div style="font-family:-apple-system,sans-serif;background:#1a1d28;border-radius:12px;padding:16px;color:#f87171;max-width:320px;font-size:0.85rem">' +
        (data.message || '获取天气失败') +
        '</div>';
      return;
    }

    var loc = data.location;
    var cur = data.current;
    var u = data.units;
    var isGps = locationSource === 'gps' || locationSource === 'cached-gps' ||
                loc.provider === 'gps' || loc.ip === 'coordinates';

    var locBadge = isGps
      ? '<span style="font-size:0.6rem;background:rgba(74,222,128,0.3);color:#4ade80;padding:1px 5px;border-radius:3px;margin-left:4px;border:1px solid rgba(74,222,128,0.4)">GPS</span>'
      : '<span style="font-size:0.6rem;background:rgba(251,191,36,0.2);color:#fbbf24;padding:1px 5px;border-radius:3px;margin-left:4px;border:1px solid rgba(251,191,36,0.3)" title="IP定位精度较低">IP</span>';

    var html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Noto Sans CJK SC\',sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;padding:16px;color:#fff;max-width:320px;box-shadow:0 4px 20px rgba(0,0,0,0.15)">';

    // Header: city + icon
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start">';
    html += '<div>';
    html += '<div style="font-size:1rem;font-weight:600;display:flex;align-items:center">' + loc.city + locBadge + '</div>';
    html += '<div style="font-size:0.7rem;opacity:0.7;margin-top:2px">' + loc.region + (loc.region ? ', ' : '') + loc.country + '</div>';
    html += '</div>';
    html += '<div style="font-size:2.2rem;line-height:1">' + icon(cur.weatherCode) + '</div>';
    html += '</div>';

    // Temperature + description
    html += '<div style="display:flex;align-items:baseline;gap:8px;margin:8px 0 4px">';
    html += '<span style="font-size:2.5rem;font-weight:300">' + Math.round(cur.temperature) + u.temperature + '</span>';
    html += '<span style="font-size:0.85rem;opacity:0.9">' + cur.weatherDescriptionZh + '</span>';
    html += '</div>';

    // Details
    html += '<div style="font-size:0.72rem;opacity:0.75">';
    html += '体感 ' + Math.round(cur.apparentTemperature) + u.temperature;
    html += ' · 湿度 ' + cur.humidity + '%';
    html += ' · ' + cur.windDirectionText + ' ' + cur.windSpeed + u.windSpeed;
    html += '</div>';

    // 6-hour forecast
    if (data.hourly && data.hourly.length > 0) {
      html += '<div style="display:flex;gap:4px;margin-top:10px;overflow-x:auto;padding-bottom:2px">';
      for (var i = 0; i < Math.min(6, data.hourly.length); i++) {
        var h = data.hourly[i];
        var t = new Date(h.time);
        html += '<div style="text-align:center;min-width:38px;flex:1">';
        html += '<div style="font-size:0.58rem;opacity:0.6">' + t.getHours() + ':00</div>';
        html += '<div style="font-size:0.95rem">' + icon(h.weatherCode) + '</div>';
        html += '<div style="font-size:0.68rem;font-weight:600">' + Math.round(h.temperature) + '°</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Footer
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">';
    html += '<span style="font-size:0.58rem;opacity:0.4">Powered by JerryWeatherAPI</span>';
    if (!isGps) {
      html += '<button onclick="JerryWeather.relocate()" style="font-size:0.62rem;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:2px 8px;cursor:pointer">📍 精确定位</button>';
    }
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
  }

  function renderLoading() {
    container.innerHTML =
      '<div style="font-family:-apple-system,sans-serif;background:#1a1d28;border-radius:12px;padding:20px;color:#8b8fa3;max-width:320px;text-align:center">' +
      '<div style="display:inline-block;width:20px;height:20px;border:2px solid #333;border-top-color:#6c8eef;border-radius:50%;animation:jw-spin 0.8s linear infinite"></div>' +
      '<div style="margin-top:8px;font-size:0.8rem">获取天气中...</div>' +
      '<style>@keyframes jw-spin{to{transform:rotate(360deg)}}</style>' +
      '</div>';
  }

  // ---- Init: GPS first, IP fallback ----
  function init() {
    renderLoading();

    // 1. Check cached GPS coordinates
    var cached = getCachedCoords();
    if (cached) {
      fetchWeather(cached).then(function (data) {
        render(data, 'cached-gps');
      }).catch(function () {
        fetchWeather(null).then(function (data) { render(data, 'ip'); });
      });
      return;
    }

    // 2. Try browser GPS (shows native permission dialog)
    getGpsCoords().then(function (coords) {
      if (coords) {
        // GPS success → use coordinates
        fetchWeather(coords).then(function (data) {
          render(data, 'gps');
        }).catch(function () {
          fetchWeather(null).then(function (data) { render(data, 'ip'); });
        });
      } else {
        // GPS denied/unavailable → IP fallback
        fetchWeather(null).then(function (data) {
          render(data, 'ip');
        }).catch(function () {
          container.innerHTML =
            '<div style="font-family:-apple-system,sans-serif;background:#1a1d28;border-radius:12px;padding:16px;color:#f87171;max-width:320px;font-size:0.85rem">获取天气失败</div>';
        });
      }
    });
  }

  // Start
  init();

  // Expose for manual control
  window.JerryWeather = {
    refresh: init,
    relocate: function () {
      clearCachedCoords();
      init();
    },
    search: function (city) {
      renderLoading();
      fetch(config.apiBase + '/api/weather?city=' + encodeURIComponent(city))
        .then(function (r) { return r.json(); })
        .then(function (data) { render(data, 'city'); });
    },
    clearCache: clearCachedCoords
  };
})();
