// ============================================================
// Vercel Serverless Function: JerryWeatherAPI
// GET /api/weather              — auto-detect IP, return weather
// GET /api/weather?ip=x.x.x.x   — weather for a specific IP
// GET /api/weather?city=邢台     — weather for a city name
// GET /api/weather?lat=37&lon=114 — weather for coordinates
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGeoLocation, getClientIp } from '../lib/geolocation.js';
import { fetchWeather, geocodeCity } from '../lib/weather.js';
import type { WeatherApiResponse, ErrorResponse, GeoLocation } from '../lib/types.js';

const cache = new Map<string, { data: WeatherApiResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(204).end();
    return;
  }

  setCorsHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    const error: ErrorResponse = {
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: `Method ${req.method} is not supported. Use GET.`,
      timestamp: new Date().toISOString(),
    };
    res.status(405).json(error);
    return;
  }

  try {
    // Parse query parameters
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const lat = req.query.lat ? parseFloat(String(req.query.lat)) : undefined;
    const lon = req.query.lon ? parseFloat(String(req.query.lon)) : undefined;
    const ipOverride = typeof req.query.ip === 'string' ? req.query.ip : undefined;

    // Build cache key
    let cacheKey: string;
    let location: GeoLocation;

    if (city) {
      // 1. City name → geocode
      cacheKey = `city:${city}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.status(200).json({ ...cached.data, cached: true });
        return;
      }
      location = await geocodeCity(city);
    } else if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
      // 2. Coordinates
      cacheKey = `coords:${lat},${lon}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.status(200).json({ ...cached.data, cached: true });
        return;
      }
      location = {
        ip: 'coordinates',
        city: 'Custom Location',
        region: '',
        country: '',
        countryCode: '',
        latitude: lat,
        longitude: lon,
        timezone: 'auto',
      };
    } else {
      // 3. Auto-detect via IP (or IP override)
      cacheKey = ipOverride || getClientIp(req.headers as any);
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        res.status(200).json({ ...cached.data, cached: true });
        return;
      }
      location = await getGeoLocation(req.headers as any, ipOverride);
    }

    // Fetch weather
    const { current, hourly, daily } = await fetchWeather(
      location.latitude,
      location.longitude,
      location.timezone
    );

    const responseData: WeatherApiResponse = {
      success: true,
      location,
      current,
      hourly,
      daily,
      fetchedAt: new Date().toISOString(),
      units: {
        temperature: '°C',
        windSpeed: 'km/h',
        precipitation: 'mm',
        pressure: 'hPa',
        visibility: 'meters',
        humidity: '%',
      },
    };

    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    res.status(200).json(responseData);
  } catch (error: any) {
    console.error('JerryWeatherAPI error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(errorResponse);
  }
}
