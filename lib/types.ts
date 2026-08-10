// ============================================================
// Type Definitions
// ============================================================

/** Geographic location information */
export interface GeoLocation {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp?: string;
  provider?: string;
}

/** Current weather conditions */
export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  weatherDescription: string;
  weatherDescriptionZh: string;
  humidity: number;
  pressure: number;
  surfacePressure: number;
  windSpeed: number;
  windDirection: number;
  windDirectionText: string;
  windGusts: number;
  cloudCover: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  isDay: boolean;
  uvIndex: number;
  visibility: number;
  observedAt: string;
}

/** Hourly forecast entry */
export interface HourlyForecast {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  weatherDescription: string;
  weatherDescriptionZh: string;
  visibility: number;
  windSpeed: number;
  uvIndex: number;
  isDay: boolean;
}

/** Daily forecast entry */
export interface DailyForecast {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  weatherDescriptionZh: string;
  tempMax: number;
  tempMin: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
}

/** Complete API response */
export interface WeatherApiResponse {
  success: boolean;
  cached?: boolean;
  location: GeoLocation;
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  fetchedAt: string;
  units: {
    temperature: string;
    windSpeed: string;
    precipitation: string;
    pressure: string;
    visibility: string;
    humidity: string;
  };
}

/** Error response */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  timestamp: string;
}
