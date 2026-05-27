"use client"

import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Music2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ExternalLink,
  AlertCircle,
} from "lucide-react"
import Image from "next/image"

interface NowPlaying {
  connected: boolean
  playing?: boolean
  track?: {
    name: string
    artist: string
    album: string
    albumArt?: string
    duration_ms: number
    progress_ms: number
    spotifyUrl?: string
  }
}

export default function SpotifyPage() {
  const [data, setData] = useState<NowPlaying | null>(null)
  const [loading, setLoading] = useState(true)
  const [controlling, setControlling] = useState(false)
  const [progress, setProgress] = useState(0)

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/now-playing")
      if (res.ok) {
        const json = await res.json()
        setData(json)
        if (json.track?.progress_ms && json.track?.duration_ms) {
          setProgress(json.track.progress_ms / json.track.duration_ms)
        }
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNowPlaying()
    const interval = setInterval(fetchNowPlaying, 5000)
    return () => clearInterval(interval)
  }, [fetchNowPlaying])

  // Progress bar animation
  useEffect(() => {
    if (!data?.playing) return
    const interval = setInterval(() => {
      setProgress((p) => {
        if (!data.track) return p
        const newProgress = p + 1000 / data.track.duration_ms
        return Math.min(newProgress, 1)
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [data?.playing, data?.track?.duration_ms])

  async function control(action: "play" | "pause" | "next" | "previous") {
    setControlling(true)
    try {
      await fetch("/api/spotify/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      setTimeout(fetchNowPlaying, 500)
    } finally {
      setControlling(false)
    }
  }

  function formatMs(ms: number) {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
  }

  return (
    <div className="p-4 lg:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Music2 size={20} className="text-green-400" /> Spotify
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5">Nu aan het afspelen</p>
      </div>

      {loading && (
        <div className="h-64 rounded-2xl bg-white/[0.03] animate-pulse" />
      )}

      {!loading && data && !data.connected && (
        <Card className="p-8 text-center">
          <div className="text-5xl mb-4">🎵</div>
          <h3 className="text-white font-semibold mb-2">Spotify verbinden</h3>
          <p className="text-neutral-500 text-sm mb-6">
            Koppel je Spotify account om je muziek te zien
          </p>
          <div className="text-xs text-neutral-600 mb-4 bg-white/[0.03] rounded-xl p-3">
            <AlertCircle size={12} className="inline mr-1.5 text-orange-400" />
            Zorg dat je SPOTIFY_CLIENT_ID en SPOTIFY_CLIENT_SECRET hebt ingesteld
            in .env.local en de callback URL in je Spotify Developer Dashboard
          </div>
          <Button
            onClick={() => (window.location.href = "/api/spotify/auth")}
            className="w-full"
          >
            Verbinden met Spotify
          </Button>
        </Card>
      )}

      {!loading && data?.connected && (
        <>
          {!data.playing || !data.track ? (
            <Card className="p-8 text-center">
              <div className="text-5xl mb-4">⏸️</div>
              <p className="text-neutral-400 text-sm">Niks aan het afspelen</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => control("play")}
                disabled={controlling}
                className="mt-4"
              >
                <Play size={14} /> Hervatten
              </Button>
            </Card>
          ) : (
            <Card glow className="overflow-hidden">
              {/* Album art */}
              {data.track.albumArt && (
                <div className="relative h-56 w-full bg-neutral-900">
                  <Image
                    src={data.track.albumArt}
                    alt={data.track.album}
                    fill
                    className="object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent" />
                </div>
              )}

              <div className="p-5">
                {/* Track info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-white truncate">
                      {data.track.name}
                    </div>
                    <div className="text-sm text-neutral-400 truncate">
                      {data.track.artist}
                    </div>
                    <div className="text-xs text-neutral-600 truncate">
                      {data.track.album}
                    </div>
                  </div>
                  {data.track.spotifyUrl && (
                    <a
                      href={data.track.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-600 hover:text-green-400 transition-colors shrink-0 ml-3 mt-0.5"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                {/* Progress */}
                <div className="mb-1">
                  <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full transition-all duration-1000"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
                    <span>{formatMs(data.track.progress_ms)}</span>
                    <span>{formatMs(data.track.duration_ms)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6 mt-4">
                  <button
                    onClick={() => control("previous")}
                    disabled={controlling}
                    className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <SkipBack size={22} />
                  </button>
                  <button
                    onClick={() => control(data.playing ? "pause" : "play")}
                    disabled={controlling}
                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    {data.playing ? (
                      <Pause size={20} className="text-black" fill="black" />
                    ) : (
                      <Play size={20} className="text-black ml-0.5" fill="black" />
                    )}
                  </button>
                  <button
                    onClick={() => control("next")}
                    disabled={controlling}
                    className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <SkipForward size={22} />
                  </button>
                </div>
              </div>
            </Card>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => (window.location.href = "/api/spotify/auth")}
              className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              Opnieuw verbinden
            </button>
          </div>
        </>
      )}
    </div>
  )
}
