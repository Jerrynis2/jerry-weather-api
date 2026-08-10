// ============================================================
// WMO Weather Interpretation Codes
// Reference: https://open-meteo.com/en/docs
// ============================================================

interface WeatherCodeInfo {
  description: string;
  descriptionZh: string;
  icon: string;
}

const weatherCodeMap: Record<number, WeatherCodeInfo> = {
  0:  { description: 'Clear sky',                 descriptionZh: '晴天',           icon: '☀️' },
  1:  { description: 'Mainly clear',             descriptionZh: '大部晴朗',       icon: '🌤️' },
  2:  { description: 'Partly cloudy',             descriptionZh: '多云',           icon: '⛅' },
  3:  { description: 'Overcast',                  descriptionZh: '阴天',           icon: '☁️' },
  45: { description: 'Fog',                        descriptionZh: '雾',             icon: '🌫️' },
  48: { description: 'Depositing rime fog',        descriptionZh: '雾凇',           icon: '🌫️' },
  51: { description: 'Light drizzle',             descriptionZh: '小毛毛雨',       icon: '🌦️' },
  53: { description: 'Moderate drizzle',          descriptionZh: '中毛毛雨',       icon: '🌦️' },
  55: { description: 'Dense drizzle',              descriptionZh: '大毛毛雨',       icon: '🌧️' },
  56: { description: 'Light freezing drizzle',    descriptionZh: '冻毛毛雨',      icon: '🌧️' },
  57: { description: 'Dense freezing drizzle',    descriptionZh: '强冻毛毛雨',    icon: '🌧️' },
  61: { description: 'Slight rain',               descriptionZh: '小雨',           icon: '🌦️' },
  63: { description: 'Moderate rain',             descriptionZh: '中雨',           icon: '🌧️' },
  65: { description: 'Heavy rain',                descriptionZh: '大雨',           icon: '🌧️' },
  66: { description: 'Light freezing rain',       descriptionZh: '冻雨',           icon: '🌧️' },
  67: { description: 'Heavy freezing rain',      descriptionZh: '强冻雨',         icon: '🌧️' },
  71: { description: 'Slight snow fall',           descriptionZh: '小雪',           icon: '🌨️' },
  73: { description: 'Moderate snow fall',        descriptionZh: '中雪',           icon: '🌨️' },
  75: { description: 'Heavy snow fall',           descriptionZh: '大雪',           icon: '❄️' },
  77: { description: 'Snow grains',               descriptionZh: '冰粒',           icon: '🌨️' },
  80: { description: 'Slight rain showers',      descriptionZh: '小阵雨',         icon: '🌦️' },
  81: { description: 'Moderate rain showers',     descriptionZh: '中阵雨',       icon: '🌧️' },
  82: { description: 'Violent rain showers',     descriptionZh: '强阵雨',         icon: '⛈️' },
  85: { description: 'Slight snow showers',       descriptionZh: '小阵雪',       icon: '🌨️' },
  86: { description: 'Heavy snow showers',        descriptionZh: '强阵雪',       icon: '❄️' },
  95: { description: 'Thunderstorm',              descriptionZh: '雷暴',           icon: '⛈️' },
  96: { description: 'Thunderstorm with slight hail', descriptionZh: '雷暴伴小冰雹', icon: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail',  descriptionZh: '雷暴伴大冰雹', icon: '⛈️' },
};

export function getWeatherInfo(code: number): WeatherCodeInfo {
  return weatherCodeMap[code] ?? {
    description: 'Unknown',
    descriptionZh: '未知',
    icon: '❓',
  };
}

export function getWeatherDescription(code: number): string {
  return getWeatherInfo(code).description;
}

export function getWeatherDescriptionZh(code: number): string {
  return getWeatherInfo(code).descriptionZh;
}

export function getWeatherIcon(code: number): string {
  return getWeatherInfo(code).icon;
}

/**
 * Convert wind direction in degrees to compass text.
 */
export function windDirectionToText(degrees: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Convert wind direction in degrees to Chinese compass text.
 */
export function windDirectionToTextZh(degrees: number): string {
  const directions = [
    '北', '北东北', '东北', '东东北', '东', '东东南', '东南', '南东南',
    '南', '南西南', '西南', '西西南', '西', '西西北', '西北', '北西北',
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
