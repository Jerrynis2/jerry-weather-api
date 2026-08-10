// ============================================================
// Weather Data Module
// Uses Open-Meteo API (free, no API key required)
// Docs: https://open-meteo.com/en/docs
// ============================================================

import type { CurrentWeather, HourlyForecast, DailyForecast, GeoLocation } from './types.js';
import {
  getWeatherDescription,
  getWeatherDescriptionZh,
  windDirectionToText,
} from './weatherCodes.js';

/**
 * Geocode a city name to coordinates using Open-Meteo Geocoding API.
 * Supports Chinese and English city names.
 * API: https://geocoding-api.open-meteo.com/v1/search
 */
export async function geocodeCity(
  cityName: string,
  language: string = 'zh'
): Promise<GeoLocation> {
  const params = new URLSearchParams({
    name: cityName,
    count: '1',
    language,
    format: 'json',
  });

  const url = `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding API error: ${response.status}`);
  }

  const data = await response.json() as any;

  if (!data.results || data.results.length === 0) {
    throw new Error(`未找到城市: ${cityName}`);
  }

  const result = data.results[0];

  return {
    ip: 'geocoded',
    city: result.name,
    region: result.admin1 || '',
    country: result.country || '',
    countryCode: result.country_code || '',
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone || 'auto',
  };
}

/**
 * Fetch comprehensive weather data from Open-Meteo.
 * Includes current conditions, 48-hour hourly forecast, and 7-day daily forecast.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  timezone: string = 'auto'
): Promise<{ current: CurrentWeather; hourly: HourlyForecast[]; daily: DailyForecast[] }> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    timezone: timezone === 'auto' ? 'auto' : timezone,

    // Current weather variables
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'snowfall',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'uv_index',
      'visibility',
    ].join(','),

    // Hourly forecast variables (48 hours)
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'visibility',
      'wind_speed_10m',
      'uv_index',
      'is_day',
    ].join(','),

    // Daily forecast variables (7 days)
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
    ].join(','),

    forecast_days: '7',
    forecast_hours: '48',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;

  // Build current weather object
  const current: CurrentWeather = {
    temperature: data.current.temperature_2m,
    apparentTemperature: data.current.apparent_temperature,
    weatherCode: data.current.weather_code,
    weatherDescription: getWeatherDescription(data.current.weather_code),
    weatherDescriptionZh: getWeatherDescriptionZh(data.current.weather_code),
    humidity: data.current.relative_humidity_2m,
    pressure: data.current.pressure_msl,
    surfacePressure: data.current.surface_pressure,
    windSpeed: data.current.wind_speed_10m,
    windDirection: data.current.wind_direction_10m,
    windDirectionText: windDirectionToText(data.current.wind_direction_10m),
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

  // Build hourly forecast (next 48 hours)
  const hourly: HourlyForecast[] = [];
  const now = new Date();
  const hourlyTimes: string[] = data.hourly.time;
  const startIndex = hourlyTimes.findIndex((t: string) => new Date(t) >= now);

  for (let i = Math.max(0, startIndex); i < hourlyTimes.length && i < Math.max(0, startIndex) + 48; i++) {
    hourly.push({
      time: data.hourly.time[i],
      temperature: data.hourly.temperature_2m[i],
      apparentTemperature: data.hourly.apparent_temperature[i],
      humidity: data.hourly.relative_humidity_2m[i],
      precipitationProbability: data.hourly.precipitation_probability[i] ?? 0,
      precipitation: data.hourly.precipitation[i],
      weatherCode: data.hourly.weather_code[i],
      weatherDescription: getWeatherDescription(data.hourly.weather_code[i]),
      weatherDescriptionZh: getWeatherDescriptionZh(data.hourly.weather_code[i]),
      visibility: data.hourly.visibility[i],
      windSpeed: data.hourly.wind_speed_10m[i],
      uvIndex: data.hourly.uv_index[i],
      isDay: data.hourly.is_day[i] === 1,
    });
  }

  // Build daily forecast (7 days)
  const daily: DailyForecast[] = data.daily.time.map((date: string, i: number) => ({
    date,
    weatherCode: data.daily.weather_code[i],
    weatherDescription: getWeatherDescription(data.daily.weather_code[i]),
    weatherDescriptionZh: getWeatherDescriptionZh(data.daily.weather_code[i]),
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    sunrise: data.daily.sunrise[i],
    sunset: data.daily.sunset[i],
    uvIndexMax: data.daily.uv_index_max[i],
    precipitationSum: data.daily.precipitation_sum[i],
    precipitationProbabilityMax: data.daily.precipitation_probability_max[i] ?? 0,
    windSpeedMax: data.daily.wind_speed_10m_max[i],
  }));

  return { current, hourly, daily };
}
