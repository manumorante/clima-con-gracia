import type { FeelsRelevance, ThermalLevel, WeatherAnalysis, WeatherSnapshot } from './types'

const CONDITION_LABELS: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna',
  55: 'Llovizna intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia',
  65: 'Lluvia intensa',
  66: 'Lluvia helada ligera',
  67: 'Lluvia helada intensa',
  71: 'Nieve ligera',
  73: 'Nieve',
  75: 'Nieve intensa',
  77: 'Granizo fino',
  80: 'Chubascos ligeros',
  81: 'Chubascos',
  82: 'Chubascos intensos',
  85: 'Nieve en chubascos',
  86: 'Nieve en chubascos intensos',
  95: 'Tormenta',
  96: 'Tormenta con granizo',
  99: 'Tormenta fuerte con granizo',
}

function toOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function baseThermalLevel(apparentTemperatureC: number): ThermalLevel {
  if (apparentTemperatureC <= 0) return 'freezing'
  if (apparentTemperatureC <= 10) return 'cold'
  if (apparentTemperatureC <= 20) return 'cool'
  if (apparentTemperatureC <= 27) return 'pleasant'
  if (apparentTemperatureC <= 32) return 'warm'
  if (apparentTemperatureC <= 37) return 'hot'
  if (apparentTemperatureC <= 42) return 'very-hot'
  return 'extreme-hot'
}

function levelUp(level: ThermalLevel): ThermalLevel {
  const map: Record<ThermalLevel, ThermalLevel> = {
    freezing: 'cold',
    cold: 'cool',
    cool: 'pleasant',
    pleasant: 'warm',
    warm: 'hot',
    hot: 'very-hot',
    'very-hot': 'extreme-hot',
    'extreme-hot': 'extreme-hot',
  }
  return map[level]
}

function levelDown(level: ThermalLevel): ThermalLevel {
  const map: Record<ThermalLevel, ThermalLevel> = {
    freezing: 'freezing',
    cold: 'freezing',
    cool: 'cold',
    pleasant: 'cool',
    warm: 'pleasant',
    hot: 'warm',
    'very-hot': 'hot',
    'extreme-hot': 'very-hot',
  }
  return map[level]
}

function computeFeelsRelevance(deltaC: number): FeelsRelevance {
  const absDelta = Math.abs(deltaC)
  if (absDelta >= 5) return 'dominant'
  if (absDelta >= 2) return 'relevant'
  return 'none'
}

function normalizeThermalLevel(snapshot: WeatherSnapshot): ThermalLevel {
  let level = baseThermalLevel(snapshot.apparentTemperatureC)

  const humidHeat = snapshot.humidityPercent >= 70 && snapshot.temperatureC >= 30
  if (humidHeat) {
    level = levelUp(level)
  }

  const windyCold = snapshot.windKmh >= 35 && snapshot.temperatureC <= 10
  if (windyCold) {
    level = levelDown(level)
  }

  return level
}

function phraseByLevel(level: ThermalLevel): string {
  const map: Record<ThermalLevel, string> = {
    freezing: 'Hace frio extremo: hoy la bufanda manda.',
    cold: 'Hace frio de verdad: abrigo y plan sin dramas.',
    cool: 'Esta fresco, ideal para salir sin sufrir.',
    pleasant: 'Temperatura agradable, hoy se juega en modo facil.',
    warm: 'Hace calorcito: agua cerca y ritmo tranquilo.',
    hot: 'Hace mucha calor: sombra y agua como religion.',
    'very-hot': 'Hace muchisima calor: salir sin agua es deporte de riesgo.',
    'extreme-hot': 'Modo horno activado: toca sobrevivir con sombra y litros de agua.',
  }
  return map[level]
}

function phraseWithDelta(base: string, snapshot: WeatherSnapshot, relevance: FeelsRelevance): string {
  if (relevance === 'none') {
    return base
  }

  const roundedTemp = toOneDecimal(snapshot.temperatureC)
  const roundedFeels = toOneDecimal(snapshot.apparentTemperatureC)

  if (snapshot.apparentTemperatureC > snapshot.temperatureC) {
    if (relevance === 'dominant') {
      return `Marca ${roundedTemp}C, pero se siente ${roundedFeels}C. ${base}`
    }
    return `${base} Ojo: se siente mas caliente (${roundedFeels}C).`
  }

  if (relevance === 'dominant') {
    return `Marca ${roundedTemp}C, pero se siente ${roundedFeels}C. ${base}`
  }
  return `${base} Se siente algo mas fresco (${roundedFeels}C).`
}

export function analyzeWeather(snapshot: WeatherSnapshot): WeatherAnalysis {
  const deltaC = toOneDecimal(snapshot.apparentTemperatureC - snapshot.temperatureC)
  const feelsRelevance = computeFeelsRelevance(deltaC)
  const thermalLevel = normalizeThermalLevel(snapshot)

  return {
    thermalLevel,
    feelsRelevance,
    deltaC,
    conditionLabel: CONDITION_LABELS[snapshot.weatherCode] ?? 'Condicion variable',
  }
}

export function createFunnyPhrase(snapshot: WeatherSnapshot, analysis: WeatherAnalysis): string {
  const rainCodes = new Set([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82])
  const stormCodes = new Set([95, 96, 99])

  if (stormCodes.has(snapshot.weatherCode)) {
    return 'Hay tormenta: hoy el outfit ganador es quedarte bajo techo.'
  }

  if (rainCodes.has(snapshot.weatherCode)) {
    const base = 'Esta lloviendo: paraguas primero, dignidad despues.'
    return phraseWithDelta(base, snapshot, analysis.feelsRelevance)
  }

  return phraseWithDelta(phraseByLevel(analysis.thermalLevel), snapshot, analysis.feelsRelevance)
}
