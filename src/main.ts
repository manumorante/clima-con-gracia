import './style.css'
import { fetchWeatherByCity, fetchWeatherByCoords } from './api/weatherApi'
import type { WeatherReport, WeatherSnapshot } from './types'
import { analyzeWeather, createFunnyPhrase } from './weatherLogic'

function toOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function buildReport(snapshot: Awaited<ReturnType<typeof fetchWeatherByCity>>): WeatherReport {
  const analysis = analyzeWeather(snapshot)
  const phrase = createFunnyPhrase(snapshot, analysis)
  return { snapshot, analysis, phrase }
}

function viewReport(report: WeatherReport): string {
  const { snapshot, analysis } = report

  return `
    <section>
      <h3>${report.phrase}</h3>
      <p><small>temperatura ${toOneDecimal(snapshot.temperatureC)}C | sensacion ${toOneDecimal(snapshot.apparentTemperatureC)}C | humedad ${snapshot.humidityPercent}% | viento ${toOneDecimal(snapshot.windKmh)} km/h | ${analysis.conditionLabel} | ${snapshot.locationName}</small></p>
    </section>
  `
}

function appTemplate(defaultCity: string): string {
  return `
    <main>
      <div id="result"><section><h3>...</h3></section></div>
      <form id="weather-form">
        <input id="city-input" name="city" value="${defaultCity}" required />
        <button type="submit">buscar</button>
        <button type="button" id="geo-button">ubicacion</button>
      </form>
      <section>
        <p>prueba frases</p>
        <label for="temp-range">temperatura <output id="temp-output">--</output>C</label>
        <input id="temp-range" type="range" min="-10" max="50" step="0.5" />
        <label for="feels-range">sensacion <output id="feels-output">--</output>C</label>
        <input id="feels-range" type="range" min="-20" max="60" step="0.5" />
        <button type="button" id="reset-sliders">restablecer valores reales</button>
      </section>
      <p id="status">listo</p>
    </main>
  `
}

function withTestValues(snapshot: WeatherSnapshot, temperatureC: number, apparentTemperatureC: number): WeatherSnapshot {
  return {
    ...snapshot,
    temperatureC,
    apparentTemperatureC,
  }
}

async function loadByCity(city: string): Promise<WeatherReport> {
  const snapshot = await fetchWeatherByCity(city)
  return buildReport(snapshot)
}

async function loadByBrowserLocation(): Promise<WeatherReport> {
  if (!('geolocation' in navigator)) {
    throw new Error('Tu navegador no soporta geolocalizacion.')
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 120000,
    })
  })

  const { latitude, longitude } = position.coords
  const locationName = `Tu ubicacion (${toOneDecimal(latitude)}, ${toOneDecimal(longitude)})`
  const snapshot = await fetchWeatherByCoords(latitude, longitude, locationName)
  return buildReport(snapshot)
}

function main(): void {
  const app = document.querySelector('#app')
  if (app === null) {
    return
  }

  const defaultCity = 'Madrid'
  app.innerHTML = appTemplate(defaultCity)

  const form = document.querySelector<HTMLFormElement>('#weather-form')
  const cityInput = document.querySelector<HTMLInputElement>('#city-input')
  const status = document.querySelector<HTMLElement>('#status')
  const result = document.querySelector<HTMLElement>('#result')
  const geoButton = document.querySelector<HTMLButtonElement>('#geo-button')
  const tempRange = document.querySelector<HTMLInputElement>('#temp-range')
  const feelsRange = document.querySelector<HTMLInputElement>('#feels-range')
  const tempOutput = document.querySelector<HTMLOutputElement>('#temp-output')
  const feelsOutput = document.querySelector<HTMLOutputElement>('#feels-output')
  const resetSliders = document.querySelector<HTMLButtonElement>('#reset-sliders')

  if (
    form === null ||
    cityInput === null ||
    status === null ||
    result === null ||
    geoButton === null ||
    tempRange === null ||
    feelsRange === null ||
    tempOutput === null ||
    feelsOutput === null ||
    resetSliders === null
  ) {
    return
  }

  let latestSnapshot: WeatherSnapshot | null = null

  const setStatus = (message: string): void => {
    status.textContent = message
  }

  const render = (report: WeatherReport): void => {
    result.innerHTML = viewReport(report)
  }

  const syncSlidersWithSnapshot = (snapshot: WeatherSnapshot): void => {
    tempRange.value = String(toOneDecimal(snapshot.temperatureC))
    feelsRange.value = String(toOneDecimal(snapshot.apparentTemperatureC))
    tempOutput.value = String(toOneDecimal(snapshot.temperatureC))
    feelsOutput.value = String(toOneDecimal(snapshot.apparentTemperatureC))
  }

  const renderFreshReport = (report: WeatherReport): void => {
    latestSnapshot = report.snapshot
    syncSlidersWithSnapshot(report.snapshot)
    render(report)
  }

  const renderFromSliders = (): void => {
    if (latestSnapshot === null) {
      return
    }

    const temperatureC = Number(tempRange.value)
    const apparentTemperatureC = Number(feelsRange.value)
    const testSnapshot = withTestValues(latestSnapshot, temperatureC, apparentTemperatureC)
    const testReport = buildReport(testSnapshot)
    tempOutput.value = String(toOneDecimal(temperatureC))
    feelsOutput.value = String(toOneDecimal(apparentTemperatureC))
    render(testReport)
    setStatus('modo prueba')
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const city = cityInput.value.trim()
    if (city.length === 0) {
      setStatus('ciudad invalida')
      return
    }

    setStatus('cargando...')
    loadByCity(city)
      .then((report) => {
        renderFreshReport(report)
        setStatus('listo')
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'No pude cargar el clima.'
        setStatus(message)
      })
  })

  geoButton.addEventListener('click', () => {
    setStatus('ubicacion...')
    loadByBrowserLocation()
      .then((report) => {
        renderFreshReport(report)
        setStatus('listo ubicacion')
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'No pude usar tu ubicacion.'
        setStatus(message)
      })
  })

  tempRange.addEventListener('input', () => {
    renderFromSliders()
  })

  feelsRange.addEventListener('input', () => {
    renderFromSliders()
  })

  resetSliders.addEventListener('click', () => {
    if (latestSnapshot === null) {
      return
    }
    syncSlidersWithSnapshot(latestSnapshot)
    render(buildReport(latestSnapshot))
    setStatus('listo')
  })

  setStatus('cargando inicial...')
  loadByCity(defaultCity)
    .then((report) => {
      renderFreshReport(report)
      setStatus('listo')
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'No pude cargar la ciudad inicial.'
      setStatus(message)
    })
}

main()
