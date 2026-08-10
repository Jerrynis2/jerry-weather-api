// ============================================================
// Local Test Server (plain JavaScript, no compilation needed)
// Usage: node server.js → open http://localhost:3000
// ============================================================

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// ---- Weather Code Mapping (WMO codes) ----
const WEATHER_CODES = {
  0:  { en: 'Clear sky',              zh: '晴天',         icon: '☀️' },
  1:  { en: 'Mainly clear',           zh: '大部晴朗',     icon: '🌤️' },
  2:  { en: 'Partly cloudy',          zh: '多云',         icon: '⛅' },
  3:  { en: 'Overcast',               zh: '阴天',         icon: '☁️' },
  45: { en: 'Fog',                    zh: '雾',           icon: '🌫️' },
  48: { en: 'Depositing rime fog',    zh: '雾凇',         icon: '🌫️' },
  51: { en: 'Light drizzle',          zh: '小毛毛雨',     icon: '🌦️' },
  53: { en: 'Moderate drizzle',      zh: '中毛毛雨',     icon: '🌦️' },
  55: { en: 'Dense drizzle',          zh: '大毛毛雨',     icon: '🌧️' },
  56: { en: 'Light freezing drizzle', zh: '冻毛毛雨',     icon: '🌧️' },
  57: { en: 'Dense freezing drizzle', zh: '强冻毛毛雨',   icon: '🌧️' },
  61: { en: 'Slight rain',            zh: '小雨',         icon: '🌦️' },
  63: { en: 'Moderate rain',          zh: '中雨',         icon: '🌧️' },
  65: { en: 'Heavy rain',             zh: '大雨',         icon: '🌧️' },
  66: { en: 'Light freezing rain',    zh: '冻雨',         icon: '🌧️' },
  67: { en: 'Heavy freezing rain',    zh: '强冻雨',       icon: '🌧️' },
  71: { en: 'Slight snow fall',       zh: '小雪',         icon: '🌨️' },
  73: { en: 'Moderate snow fall',     zh: '中雪',         icon: '🌨️' },
  75: { en: 'Heavy snow fall',        zh: '大雪',         icon: '❄️' },
  77: { en: 'Snow grains',            zh: '冰粒',         icon: '🌨️' },
  80: { en: 'Slight rain showers',    zh: '小阵雨',       icon: '🌦️' },
  81: { en: 'Moderate rain showers',  zh: '中阵雨',       icon: '🌧️' },
  82: { en: 'Violent rain showers',   zh: '强阵雨',       icon: '⛈️' },
  85: { en: 'Slight snow showers',    zh: '小阵雪',       icon: '🌨️' },
  86: { en: 'Heavy snow showers',     zh: '强阵雪',       icon: '❄️' },
  95: { en: 'Thunderstorm',           zh: '雷暴',         icon: '⛈️' },
  96: { en: 'Thunderstorm with slight hail', zh: '雷暴伴小冰雹', icon: '⛈️' },
  99: { en: 'Thunderstorm with heavy hail',  zh: '雷暴伴大冰雹', icon: '⛈️' },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { en: 'Unknown', zh: '未知', icon: '❓' };
}

function windDirText(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ---- IP Detection ----
function isPrivateIp(ip) {
  if (!ip) return true;
  return ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0' ||
    ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.') ||
    ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') || ip.startsWith('172.2') || ip.startsWith('172.3') ||
    ip.startsWith('fc') || ip.startsWith('fe80');
}

function getClientIp(headers) {
  const keys = ['x-forwarded-for', 'x-real-ip', 'x-client-ip', 'x-vercel-forwarded-for', 'cf-connecting-ip'];
  for (const key of keys) {
    const value = headers[key];
    if (value) {
      const ip = String(value).split(',')[0].trim();
      if (ip && ip !== 'unknown') return ip;
    }
  }
  return '127.0.0.1';
}

async function getPublicIp() {
  try {
    const resp = await fetch('https://api.ipify.org?format=json');
    if (resp.ok) {
      const data = await resp.json();
      if (data.ip) return data.ip;
    }
  } catch (e) {
    console.error('ipify failed:', e.message);
  }
  return null;
}

// ---- IP Geolocation ----
async function getGeoFromIpApiCom(ip) {
  const queryIp = isPrivateIp(ip) ? '' : ip;
  const url = `http://ip-api.com/json/${queryIp}?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp,query`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data.status !== 'success') return null;
  return {
    ip: data.query || ip,
    city: data.city || 'Unknown',
    region: data.regionName || '',
    country: data.country || '',
    countryCode: data.countryCode || '',
    latitude: data.lat,
    longitude: data.lon,
    timezone: data.timezone || 'auto',
    isp: data.isp || undefined,
  };
}

async function getGeoFromIpInfo(ip) {
  const queryIp = isPrivateIp(ip) ? '' : `${ip}/json`;
  const url = `https://ipinfo.io/${queryIp}/json`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.ip || !data.loc) return null;
  const [lat, lon] = data.loc.split(',').map(v => parseFloat(v));
  if (isNaN(lat) || isNaN(lon)) return null;
  return {
    ip: data.ip,
    city: data.city || 'Unknown',
    region: data.region || '',
    country: data.country || '',
    countryCode: data.country || '',
    latitude: lat,
    longitude: lon,
    timezone: data.timezone || 'auto',
    isp: data.org || undefined,
  };
}

async function getGeoFromIpWhoIs(ip) {
  const queryIp = isPrivateIp(ip) ? '' : ip;
  const resp = await fetch(`https://ipwho.is/${queryIp}`);
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.success) return null;
  return {
    ip: data.ip || ip,
    city: data.city || 'Unknown',
    region: data.region || '',
    country: data.country || '',
    countryCode: data.country_code || '',
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone?.id || 'auto',
    isp: data.connection?.isp || undefined,
  };
}

async function getGeoLocation(headers, ipOverride) {
  let ip = ipOverride || getClientIp(headers);
  let provider = 'unknown';

  if (isPrivateIp(ip)) {
    const publicIp = await getPublicIp();
    if (publicIp) ip = publicIp;
  }

  // 1. ip-api.com (better for Chinese IPs, HTTP)
  try {
    const geo = await getGeoFromIpApiCom(ip);
    if (geo) return { ...geo, provider: 'ip-api.com' };
  } catch (e) {
    console.error('ip-api.com failed:', e.message);
  }

  // 2. ipinfo.io (HTTPS, good Chinese accuracy)
  try {
    const geo = await getGeoFromIpInfo(ip);
    if (geo) return { ...geo, provider: 'ipinfo.io' };
  } catch (e) {
    console.error('ipinfo.io failed:', e.message);
  }

  // 3. ipwho.is
  try {
    const geo = await getGeoFromIpWhoIs(ip);
    if (geo) return { ...geo, provider: 'ipwho.is' };
  } catch (e) {
    console.error('ipwho.is failed:', e.message);
  }

  throw new Error('Unable to determine geolocation. All providers failed.');
}

// ---- City Geocoding ----
async function geocodeCity(cityName, language = 'zh') {
  const params = new URLSearchParams({ name: cityName, count: '1', language, format: 'json' });
  const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!resp.ok) throw new Error(`Geocoding API error: ${resp.status}`);
  const data = await resp.json();
  if (!data.results || data.results.length === 0) throw new Error(`未找到城市: ${cityName}`);
  const r = data.results[0];
  return {
    ip: 'geocoded',
    city: r.name,
    region: r.admin1 || '',
    country: r.country || '',
    countryCode: r.country_code || '',
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone || 'auto',
    provider: 'open-meteo-geocoding',
  };
}

// ---- Weather Data Fetching ----
async function fetchWeather(lat, lon, timezone = 'auto') {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility',
    hourly: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,visibility,wind_speed_10m,uv_index,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
    forecast_days: '7',
    forecast_hours: '48',
  });

  const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!resp.ok) throw new Error(`Open-Meteo error: ${resp.status}`);
  const data = await resp.json();

  const wInfo = getWeatherInfo(data.current.weather_code);
  const current = {
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    weatherCode: data.current.weather_code,
    weatherDescription: wInfo.en,
    weatherDescriptionZh: wInfo.zh,
    humidity: data.current.relative_humidity_2m,
    pressure: data.current.pressure_msl,
    surfacePressure: data.current.surface_pressure,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    windDirectionText: windDirText(data.current.wind_direction_10m),
    windGusts: data.current.wind_gusts_10m,
    cloudCover: data.current.cloud_cover,
    precipitation: data.current.precipitation,
    rain: data.current.rain,
    snowfall: data.current.snowfall,
    isDay: data.current.is_day === 1,
    uvIndex: data.current.uv_index,
    visibility: data.current.visibility,
    observedAt: data.current.time,
  };

  const hourly = [];
  const now = new Date();
  const times = data.hourly.time;
  const startIdx = times.findIndex(t => new Date(t) >= now);
  for (let i = Math.max(0, startIdx); i < times.length && i < Math.max(0, startIdx) + 48; i++) {
    const hInfo = getWeatherInfo(data.hourly.weather_code[i]);
    hourly.push({
      time: data.hourly.time[i],
      temperature: data.hourly.temperature_2m[i],
      apparentTemperature: data.hourly.apparent_temperature[i],
      humidity: data.hourly.relative_humidity_2m[i],
      precipitationProbability: data.hourly.precipitation_probability[i] ?? 0,
      precipitation: data.hourly.precipitation[i],
      weatherCode: data.hourly.weather_code[i],
      weatherDescription: hInfo.en,
      weatherDescriptionZh: hInfo.zh,
      visibility: data.hourly.visibility[i],
      windSpeed: data.hourly.wind_speed_10m[i],
      uvIndex: data.hourly.uv_index[i],
      isDay: data.hourly.is_day[i] === 1,
    });
  }

  const daily = data.daily.time.map((date, i) => {
    const dInfo = getWeatherInfo(data.daily.weather_code[i]);
    return {
      date,
      weatherCode: data.daily.weather_code[i],
      weatherDescription: dInfo.en,
      weatherDescriptionZh: dInfo.zh,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      uvIndexMax: data.daily.uv_index_max[i],
      precipitationSum: data.daily.precipitation_sum[i],
      precipitationProbabilityMax: data.daily.precipitation_probability_max[i] ?? 0,
      windSpeedMax: data.daily.wind_speed_10m_max[i],
    };
  });

  return { current, hourly, daily };
}

// ---- Simple Cache ----
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// ---- HTTP Server ----
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ---- Static files (documentation page, favicon, etc.) ----
  if (url.pathname === '/' || url.pathname === '/index.html') {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Documentation page not found. Make sure public/index.html exists.');
    }
    return;
  }

  // ---- API: Health Check ----
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      status: 'ok',
      service: 'JerryWeatherAPI',
      version: '1.1.0',
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // ---- API: Location Debug ----
  if (url.pathname === '/api/location') {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Use GET.' }));
      return;
    }
    try {
      const ipOverride = url.searchParams.get('ip') || undefined;
      const detectedIp = ipOverride || getClientIp(req.headers);
      const location = await getGeoLocation(req.headers, ipOverride);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        detectedIp,
        provider: location.provider,
        location,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: 'INTERNAL_ERROR', message: error.message }));
    }
    return;
  }

  // ---- API: Weather ----
  if (url.pathname === '/api/weather') {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'METHOD_NOT_ALLOWED', message: 'Use GET.' }));
      return;
    }

    try {
      const city = url.searchParams.get('city') || undefined;
      const lat = url.searchParams.get('lat') ? parseFloat(url.searchParams.get('lat')) : undefined;
      const lon = url.searchParams.get('lon') ? parseFloat(url.searchParams.get('lon')) : undefined;
      const ipOverride = url.searchParams.get('ip') || undefined;

      let cacheKey, location;

      if (city) {
        cacheKey = `city:${city}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ...cached.data, cached: true }));
          return;
        }
        location = await geocodeCity(city);
      } else if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
        cacheKey = `coords:${lat},${lon}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ...cached.data, cached: true }));
          return;
        }
        location = {
          ip: 'coordinates', city: 'Custom Location', region: '', country: '',
          countryCode: '', latitude: lat, longitude: lon, timezone: 'auto', provider: 'manual-coords',
        };
      } else {
        cacheKey = ipOverride || getClientIp(req.headers);
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ...cached.data, cached: true }));
          return;
        }
        location = await getGeoLocation(req.headers, ipOverride);
      }

      const { current, hourly, daily } = await fetchWeather(
        location.latitude, location.longitude, location.timezone
      );

      const responseData = {
        success: true,
        location,
        current,
        hourly,
        daily,
        fetchedAt: new Date().toISOString(),
        units: {
          temperature: '°C', windSpeed: 'km/h', precipitation: 'mm',
          pressure: 'hPa', visibility: 'meters', humidity: '%',
        },
      };

      cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(responseData));
    } catch (error) {
      console.error('API Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false, error: 'INTERNAL_ERROR',
        message: error.message, timestamp: new Date().toISOString(),
      }));
    }
    return;
  }

  // ---- 404 ----
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'NOT_FOUND', path: url.pathname }));
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ┌──────────────────────────────────────────────────┐');
  console.log('  │                                                  │');
  console.log('  │   JerryWeatherAPI - Local Test Server v1.1        │');
  console.log('  │                                                  │');
  console.log(`  │   API Docs:   http://localhost:${PORT}              │`);
  console.log(`  │   Weather:   http://localhost:${PORT}/api/weather  │`);
  console.log(`  │   Location:  http://localhost:${PORT}/api/location │`);
  console.log(`  │   Health:    http://localhost:${PORT}/api/health   │`);
  console.log('  │                                                  │');
  console.log('  │   Press Ctrl+C to stop                           │');
  console.log('  │                                                  │');
  console.log('  └──────────────────────────────────────────────────┘');
  console.log('');
});
