import { useState, useEffect } from 'react'
import { CloudSun, Droplets, Loader2, LocateFixed, MapPin, Search, Wind } from 'lucide-react'
import {
  buildWeatherForecastUrl,
  buildWeatherGeocodingUrl,
  formatWeatherLocationLabel,
  parseGeocodingResults,
  parseWeatherForecast,
  type WeatherLocation,
  type WeatherSummary,
} from '@/lib/weather'
import type { WeatherConfig } from '@/types/widgetSettings'

const WEATHER_LOCATION_STORAGE_KEY = 'flowspace_weather_location'

function loadSavedWeatherLocation(): WeatherLocation | null {
  try {
    const raw = localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY)
    if (!raw) return null
    const location = JSON.parse(raw) as WeatherLocation
    if (typeof location.name !== 'string' || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') return null
    return location
  } catch {
    return null
  }
}

function saveWeatherLocation(location: WeatherLocation) {
  try { localStorage.setItem(WEATHER_LOCATION_STORAGE_KEY, JSON.stringify(location)) } catch {}
}

export default function WeatherWidget({ config }: { config: WeatherConfig }) {
  const [weatherLocation, setWeatherLocation] = useState<WeatherLocation | null>(() => loadSavedWeatherLocation())
  const [weather, setWeather] = useState<WeatherSummary | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherLocating, setWeatherLocating] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [weatherQuery, setWeatherQuery] = useState('')

  useEffect(() => {
    if (weatherLocation) return
    detectWeatherLocation()
  }, [])

  useEffect(() => {
    if (!weatherLocation) return
    let cancelled = false

    async function loadWeather() {
      setWeatherLoading(true)
      setWeatherError(null)
      try {
        const res = await fetch(buildWeatherForecastUrl(weatherLocation!))
        if (!res.ok) throw new Error('Weather service unavailable.')
        const data = await res.json()
        if (!cancelled) setWeather(parseWeatherForecast(data))
      } catch (err) {
        if (!cancelled) setWeatherError(err instanceof Error ? err.message : 'Weather failed to load.')
      } finally {
        if (!cancelled) setWeatherLoading(false)
      }
    }

    loadWeather()
    return () => { cancelled = true }
  }, [weatherLocation])

  function detectWeatherLocation() {
    if (!navigator.geolocation) {
      setWeatherError('Choose a city to show weather.')
      return
    }
    setWeatherLocating(true)
    setWeatherError(null)
    navigator.geolocation.getCurrentPosition(
      position => {
        const location: WeatherLocation = {
          name: 'Current location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        saveWeatherLocation(location)
        setWeatherLocation(location)
        setWeatherLocating(false)
      },
      () => {
        setWeatherError('Location access was blocked. Search for a city instead.')
        setWeatherLocating(false)
      },
      { enableHighAccuracy: false, maximumAge: 1000 * 60 * 30, timeout: 8000 },
    )
  }

  async function searchWeatherLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = weatherQuery.trim()
    if (query.length < 2) { setWeatherError('Enter a city or zip code.'); return }
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const res = await fetch(buildWeatherGeocodingUrl(query))
      if (!res.ok) throw new Error('Location search failed.')
      const results = parseGeocodingResults(await res.json())
      const location = results[0]
      if (!location) throw new Error('No matching location found.')
      saveWeatherLocation(location)
      setWeatherLocation(location)
      setWeatherQuery('')
    } catch (err) {
      setWeatherError(err instanceof Error ? err.message : 'Location search failed.')
    } finally {
      setWeatherLoading(false)
    }
  }

  const locationLabel = weatherLocation ? formatWeatherLocationLabel(weatherLocation) : 'Finding your location'
  const toC = (f: number) => Math.round((f - 32) * 5 / 9)
  const fmt = (f: number) => config.unit === 'C' ? toC(f) : Math.round(f)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-br from-surface-1 via-surface-1 to-sky-500/10 p-3">
      <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-sky-300">
        <CloudSun size={13} />
        Weather
      </div>

      <div className="my-auto min-h-0 py-2">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-gray-500">
          <MapPin size={12} className="shrink-0 text-sky-300" />
          <span className="truncate">{locationLabel}</span>
        </div>

        {weatherLoading && !weather ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={15} className="animate-spin text-sky-300" />
            Loading weather
          </div>
        ) : weather ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-4xl font-semibold leading-none text-white tabular-nums md:text-5xl">
                  {fmt(weather.temperature)}°{config.unit}
                </p>
                {config.showFeelsLike && (
                  <p className="mt-1 truncate text-xs font-medium text-gray-500">
                    Feels {fmt(weather.feelsLike)}° · H {fmt(weather.high)}° / L {fmt(weather.low)}°
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl leading-none">{weather.condition.icon}</p>
                <p className="mt-1 max-w-[7rem] truncate text-xs font-medium text-sky-200">{weather.condition.label}</p>
              </div>
            </div>

            {(config.showHumidity || config.showWind || config.showPrecipitation || config.showUvIndex || config.showSunriseSunset) && (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {config.showHumidity && (
                  <div className="rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5">
                    <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-600">
                      <Droplets size={10} /> Humid
                    </div>
                    <p className="text-xs font-semibold text-gray-200">{weather.humidity}%</p>
                  </div>
                )}
                {config.showWind && (
                  <div className="rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5">
                    <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-600">
                      <Wind size={10} /> Wind
                    </div>
                    <p className="text-xs font-semibold text-gray-200">
                      {config.unit === 'C' ? `${Math.round(weather.windSpeed * 1.60934)} km/h` : `${weather.windSpeed} mph`}
                    </p>
                  </div>
                )}
                {config.showPrecipitation && (
                  <div className="rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-600">Rain</div>
                    <p className="text-xs font-semibold text-gray-200">{weather.precipitation}"</p>
                  </div>
                )}
                {config.showUvIndex && (
                  <div className="rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-600">UV</div>
                    <p className="text-xs font-semibold text-gray-200">{weather.uvIndex}</p>
                  </div>
                )}
                {config.showSunriseSunset && weather.sunrise && (
                  <div className="col-span-2 rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-gray-600">Sun</div>
                    <p className="text-xs font-semibold text-gray-200">↑ {weather.sunrise} · ↓ {weather.sunset}</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed text-gray-500">Allow location access or search for a city to show weather.</p>
        )}
      </div>

      <form
        data-home-widget-edit-control="true"
        onSubmit={searchWeatherLocation}
        className="mt-auto flex shrink-0 items-center gap-1.5"
      >
        <input
          value={weatherQuery}
          onChange={event => setWeatherQuery(event.target.value)}
          placeholder="City or zip"
          className="min-w-0 flex-1 rounded-lg border border-surface-3 bg-surface-2 px-2 py-1.5 text-xs text-white outline-none transition-colors placeholder:text-gray-600 focus:border-sky-400/40"
          aria-label="Weather location"
        />
        <button
          type="button"
          data-home-widget-edit-control="true"
          onClick={detectWeatherLocation}
          disabled={weatherLocating || weatherLoading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-3 bg-surface-2 text-gray-400 transition-colors hover:border-sky-400/30 hover:text-sky-200 disabled:opacity-60"
          title="Use my location"
        >
          {weatherLocating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
        </button>
        <button
          type="submit"
          disabled={weatherLoading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-surface-0 transition-colors hover:bg-sky-400 disabled:opacity-60"
          title="Search location"
        >
          {weatherLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
        </button>
      </form>

      {weatherError && (
        <p className="mt-1.5 shrink-0 truncate text-[11px] text-yellow-200">{weatherError}</p>
      )}
    </div>
  )
}
