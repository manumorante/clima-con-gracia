import type { WeatherSnapshot } from '../types'

type GeocodingResult = {
  name: string
  country?: string
  latitude: number
  longitude: number
}

type GeocodingResponse = {
  results?: GeocodingResult[]
}

type ForecastCurrent = {
  time: string
  temperature_2m: number
  apparent_temperature: number
  relative_humidity_2m: number
  wind_speed_10m: number
  weather_code: number
  is_day: number
}

type ForecastResponse = {
  current?: ForecastCurrent
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === 'number' ? value : null
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' ? value : null
}

async function requestJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }
  return response.json()
}

function parseGeocodingResponse(payload: unknown): GeocodingResponse {
  if (!isRecord(payload)) {
    return {}
  }

  const maybeResults = payload.results
  if (!Array.isArray(maybeResults)) {
    return {}
  }

  const parsed: GeocodingResult[] = []
  for (const item of maybeResults) {
    if (!isRecord(item)) {
      continue
    }

    const name = readString(item, 'name')
    const latitude = readNumber(item, 'latitude')
    const longitude = readNumber(item, 'longitude')
    if (name === null || latitude === null || longitude === null) {
      continue
    }

    const country = readString(item, 'country') ?? undefined
    parsed.push({ name, country, latitude, longitude })
  }

  return { results: parsed }
}

function parseForecastResponse(payload: unknown): ForecastResponse {
  if (!isRecord(payload)) {
    return {}
  }

  const maybeCurrent = payload.current
  if (!isRecord(maybeCurrent)) {
    return {}
  }

  const time = readString(maybeCurrent, 'time')
  const temperature_2m = readNumber(maybeCurrent, 'temperature_2m')
  const apparent_temperature = readNumber(maybeCurrent, 'apparent_temperature')
  const relative_humidity_2m = readNumber(maybeCurrent, 'relative_humidity_2m')
  const wind_speed_10m = readNumber(maybeCurrent, 'wind_speed_10m')
  const weather_code = readNumber(maybeCurrent, 'weather_code')
  const is_day = readNumber(maybeCurrent, 'is_day')

  if (
    time === null ||
    temperature_2m === null ||
    apparent_temperature === null ||
    relative_humidity_2m === null ||
    wind_speed_10m === null ||
    weather_code === null ||
    is_day === null
  ) {
    return {}
  }

  return {
    current: {
      time,
      temperature_2m,
      apparent_temperature,
      relative_humidity_2m,
      wind_speed_10m,
      weather_code,
      is_day,
    },
  }
}

export async function resolveCity(query: string): Promise<GeocodingResult> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', query)
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'es')
  url.searchParams.set('format', 'json')

  const parsed = parseGeocodingResponse(await requestJson(url.toString()))
  const result = parsed.results?.[0]
  if (result === undefined) {
    throw new Error('No pude encontrar esa ciudad.')
  }

  return result
}

export async function fetchWeatherByCoords(
  latitude: number,
  longitude: number,
  locationName: string,
): Promise<WeatherSnapshot> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
  )
  url.searchParams.set('timezone', 'auto')

  const parsed = parseForecastResponse(await requestJson(url.toString()))
  const current = parsed.current
  if (current === undefined) {
    throw new Error('No pude leer el clima actual.')
  }

  return {
    locationName,
    temperatureC: current.temperature_2m,
    apparentTemperatureC: current.apparent_temperature,
    humidityPercent: current.relative_humidity_2m,
    windKmh: current.wind_speed_10m,
    weatherCode: current.weather_code,
    isDay: current.is_day === 1,
    observedAt: current.time,
  }
}

export async function fetchWeatherByCity(city: string): Promise<WeatherSnapshot> {
  const place = await resolveCity(city)
  const locationName = place.country === undefined ? place.name : `${place.name}, ${place.country}`
  return fetchWeatherByCoords(place.latitude, place.longitude, locationName)
}
