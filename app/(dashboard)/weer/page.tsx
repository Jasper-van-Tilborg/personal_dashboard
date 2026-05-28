"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CloudSun, Wind, Droplets, RefreshCw, AlertCircle } from "lucide-react"

interface WeatherData {
  city: string
  temp: number
  feels_like: number
  description: string
  icon: string
  humidity: number
  wind_speed: number
  forecast: {
    time: string
    temp: number
    icon: string
    description: string
  }[]
}

const WEATHER_ICONS: Record<string, string> = {
  "01d": "☀️", "01n": "🌙",
  "02d": "⛅", "02n": "⛅",
  "03d": "☁️", "03n": "☁️",
  "04d": "☁️", "04n": "☁️",
  "09d": "🌧️", "09n": "🌧️",
  "10d": "🌦️", "10n": "🌦️",
  "11d": "⛈️", "11n": "⛈️",
  "13d": "❄️", "13n": "❄️",
  "50d": "🌫️", "50n": "🌫️",
}

export default function WeerPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchWeather()
  }, [])

  async function fetchWeather() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/weather")
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? "Kan weer niet laden")
        setLoading(false)
        return
      }
      const data = await res.json()
      setWeather(data)
      setLastUpdated(new Date())
    } catch {
      setError("Kan weer niet laden")
    }
    setLoading(false)
  }

  const getIcon = (code: string) => WEATHER_ICONS[code] ?? "🌡️"

  return (
    <div className="p-4 lg:p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CloudSun size={20} className="text-blue-400" /> Weer
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5">
            {lastUpdated
              ? `Bijgewerkt om ${lastUpdated.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`
              : "Gilze, NL"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchWeather} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {error && (
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-3 text-neutral-400">
            <AlertCircle size={20} className="text-red-400" />
            <div>
              <p className="text-sm">{error}</p>
              <p className="text-xs text-neutral-600 mt-0.5">
                Voeg OPENWEATHER_API_KEY toe aan .env.local
              </p>
            </div>
          </div>
        </Card>
      )}

      {loading && !weather && (
        <div className="space-y-3">
          <div className="h-48 rounded-2xl bg-white/[0.03] animate-pulse" />
          <div className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />
        </div>
      )}

      {weather && (
        <>
          {/* Main weather card */}
          <Card glow className="p-6 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-6xl font-bold text-white">
                  {weather.temp}°
                </div>
                <div className="text-neutral-400 text-sm capitalize mt-1">
                  {weather.description}
                </div>
                <div className="text-neutral-600 text-xs mt-0.5">
                  Voelt als {weather.feels_like}°
                </div>
              </div>
              <div className="text-7xl">{getIcon(weather.icon)}</div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                <Droplets size={14} className="text-blue-400" />
                {weather.humidity}%
              </div>
              <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                <Wind size={14} className="text-neutral-500" />
                {weather.wind_speed} km/u
              </div>
              <div className="text-sm text-neutral-500">{weather.city}</div>
            </div>
          </Card>

          {/* Forecast */}
          {weather.forecast.length > 0 && (
            <Card className="p-4">
              <div className="text-xs text-neutral-500 mb-3">Komende uren</div>
              <div className="grid grid-cols-4 gap-2">
                {weather.forecast.map((f, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[10px] text-neutral-600 mb-1">{f.time}</div>
                    <div className="text-2xl mb-1">{getIcon(f.icon)}</div>
                    <div className="text-sm font-medium text-white">{f.temp}°</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
