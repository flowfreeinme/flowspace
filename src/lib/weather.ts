export interface WeatherLocation {
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country?: string
}

export interface WeatherCondition {
  label: string
  icon: string
}

export interface WeatherSummary {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  precipitation: number
  high: number
  low: number
  condition: WeatherCondition
}

export function buildWeatherForecastUrl(location: Pick<WeatherLocation, 'latitude' | 'longitude'>) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'weather_code',
      'wind_speed_10m',
      'precipitation',
      'is_day',
    ].join(','),
    daily: ['temperature_2m_max', 'temperature_2m_min'].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    forecast_days: '1',
    timezone: 'auto',
  })
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
}

export function buildWeatherGeocodingUrl(query: string) {
  const params = new URLSearchParams({
    name: query.trim(),
    count: '5',
    language: 'en',
    format: 'json',
  })
  return `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`
}

export function formatWeatherLocationLabel(location: WeatherLocation) {
  if (location.admin1) return `${location.name}, ${location.admin1}`
  if (location.country) return `${location.name}, ${location.country}`
  return location.name
}

export function parseGeocodingResults(data: unknown): WeatherLocation[] {
  const results = typeof data === 'object' && data && 'results' in data && Array.isArray(data.results)
    ? data.results
    : []

  return results.flatMap(result => {
    if (
      !result ||
      typeof result !== 'object' ||
      typeof result.name !== 'string' ||
      typeof result.latitude !== 'number' ||
      typeof result.longitude !== 'number'
    ) {
      return []
    }

    return [{
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      admin1: typeof result.admin1 === 'string' ? result.admin1 : undefined,
      country: typeof result.country === 'string' ? result.country : undefined,
    }]
  })
}

export function getWeatherCondition(code: number, isDay: boolean): WeatherCondition {
  if (code === 0) return { label: 'Clear', icon: isDay ? '☀️' : '🌙' }
  if ([1, 2].includes(code)) return { label: 'Partly cloudy', icon: isDay ? '🌤️' : '☁️' }
  if (code === 3) return { label: 'Cloudy', icon: '☁️' }
  if ([45, 48].includes(code)) return { label: 'Fog', icon: '🌫️' }
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', icon: '🌦️' }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain', icon: '🌧️' }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', icon: '❄️' }
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: '⛈️' }
  return { label: 'Weather', icon: '🌡️' }
}

function finiteNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback
}

export function parseWeatherForecast(data: unknown): WeatherSummary {
  const current = typeof data === 'object' && data && 'current' in data && data.current && typeof data.current === 'object'
    ? data.current as Record<string, unknown>
    : {}
  const daily = typeof data === 'object' && data && 'daily' in data && data.daily && typeof data.daily === 'object'
    ? data.daily as Record<string, unknown>
    : {}

  const high = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : undefined
  const low = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : undefined
  const weatherCode = finiteNumber(current.weather_code)
  const isDay = current.is_day !== 0

  return {
    temperature: finiteNumber(current.temperature_2m),
    feelsLike: finiteNumber(current.apparent_temperature),
    humidity: finiteNumber(current.relative_humidity_2m),
    windSpeed: finiteNumber(current.wind_speed_10m),
    precipitation: finiteNumber(current.precipitation),
    high: finiteNumber(high),
    low: finiteNumber(low),
    condition: getWeatherCondition(weatherCode, isDay),
  }
}
