export type ThermalLevel =
  | 'freezing'
  | 'cold'
  | 'cool'
  | 'pleasant'
  | 'warm'
  | 'hot'
  | 'very-hot'
  | 'extreme-hot'

export type FeelsRelevance = 'none' | 'relevant' | 'dominant'

export type WeatherSnapshot = {
  locationName: string
  temperatureC: number
  apparentTemperatureC: number
  humidityPercent: number
  windKmh: number
  weatherCode: number
  isDay: boolean
  observedAt: string
}

export type WeatherAnalysis = {
  thermalLevel: ThermalLevel
  feelsRelevance: FeelsRelevance
  deltaC: number
  conditionLabel: string
}

export type WeatherReport = {
  snapshot: WeatherSnapshot
  analysis: WeatherAnalysis
  phrase: string
}
