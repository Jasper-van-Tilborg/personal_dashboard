import { NextResponse } from "next/server"

const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes
let cache: { data: unknown; timestamp: number } | null = null

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return NextResponse.json(cache.data)
  }

  const apiKey = process.env.OPENWEATHER_API_KEY
  const lat = process.env.NEXT_PUBLIC_WEATHER_LAT ?? "51.557"
  const lon = process.env.NEXT_PUBLIC_WEATHER_LON ?? "4.933"

  if (!apiKey) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 })
  }

  const coords = `lat=${lat}&lon=${lon}`

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?${coords}&appid=${apiKey}&units=metric&lang=nl`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?${coords}&appid=${apiKey}&units=metric&lang=nl&cnt=24`
      ),
    ])

    if (!currentRes.ok) {
      return NextResponse.json({ error: "Weather API error" }, { status: 502 })
    }

    const current = await currentRes.json()
    const forecast = forecastRes.ok ? await forecastRes.json() : null

    // Next 4 forecast points (every 3 hours)
    const nextForecast = forecast?.list?.slice(1, 5).map((f: any) => ({
      time: new Date(f.dt * 1000).toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      temp: Math.round(f.main.temp),
      icon: f.weather[0].icon,
      description: f.weather[0].description,
    }))

    const data = {
      city: current.name,
      temp: Math.round(current.main.temp),
      feels_like: Math.round(current.main.feels_like),
      description: current.weather[0].description,
      icon: current.weather[0].icon,
      humidity: current.main.humidity,
      wind_speed: Math.round(current.wind.speed * 3.6),
      forecast: nextForecast ?? [],
    }

    cache = { data, timestamp: Date.now() }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 })
  }
}
