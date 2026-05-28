import { describe, expect, it } from 'vitest'
import {
  buildWeatherForecastUrl,
  formatWeatherLocationLabel,
  getWeatherCondition,
  parseGeocodingResults,
  parseWeatherForecast,
} from './weather'

describe('weather helpers', () => {
  it('builds a no-key Open-Meteo forecast URL for current conditions', () => {
    const url = buildWeatherForecastUrl({ latitude: 41.88, longitude: -87.63 })

    expect(url).toContain('https://api.open-meteo.com/v1/forecast')
    expect(url).toContain('current=temperature_2m')
    expect(url).toContain('temperature_unit=fahrenheit')
    expect(url).toContain('timezone=auto')
  })

  it('formats weather locations with city and region', () => {
    expect(formatWeatherLocationLabel({
      name: 'Chicago',
      admin1: 'Illinois',
      country: 'United States',
      latitude: 41.88,
      longitude: -87.63,
    })).toBe('Chicago, Illinois')
  })

  it('parses the first geocoding result', () => {
    const results = parseGeocodingResults({
      results: [{
        name: 'Austin',
        admin1: 'Texas',
        country: 'United States',
        latitude: 30.27,
        longitude: -97.74,
      }],
    })

    expect(results[0]).toMatchObject({
      name: 'Austin',
      admin1: 'Texas',
      latitude: 30.27,
      longitude: -97.74,
    })
  })

  it('parses current weather into a compact summary', () => {
    const weather = parseWeatherForecast({
      current: {
        temperature_2m: 72,
        apparent_temperature: 75,
        relative_humidity_2m: 55,
        weather_code: 3,
        wind_speed_10m: 9,
        precipitation: 0,
        is_day: 1,
      },
      daily: {
        temperature_2m_max: [78],
        temperature_2m_min: [63],
      },
    })

    expect(weather).toEqual({
      temperature: 72,
      feelsLike: 75,
      humidity: 55,
      windSpeed: 9,
      precipitation: 0,
      high: 78,
      low: 63,
      condition: getWeatherCondition(3, true),
    })
  })
})
