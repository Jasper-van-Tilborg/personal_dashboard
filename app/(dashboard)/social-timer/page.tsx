"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { SocialMediaTransaction } from "@/types/database"
import { today, formatDuration } from "@/lib/utils"
import { Clock, Play, Square, Dumbbell, CheckSquare, Moon, Plus } from "lucide-react"

const TIMER_KEY = "social_timer_session"

interface TimerSession {
  startTime: number
  durationMs: number
  minutesDeducted: number
}

export default function SocialTimerPage() {
  const [transactions, setTransactions] = useState<SocialMediaTransaction[]>([])
  const [balance, setBalance] = useState(0)
  const [activeSession, setActiveSession] = useState<TimerSession | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [inputMinutes, setInputMinutes] = useState(30)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
    // Restore active session from localStorage
    const saved = localStorage.getItem(TIMER_KEY)
    if (saved) {
      const session: TimerSession = JSON.parse(saved)
      const elapsed = Date.now() - session.startTime
      if (elapsed < session.durationMs) {
        setActiveSession(session)
        setTimeLeft(Math.ceil((session.durationMs - elapsed) / 1000))
      } else {
        localStorage.removeItem(TIMER_KEY)
      }
    }
  }, [])

  useEffect(() => {
    if (activeSession) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - activeSession.startTime
        const remaining = Math.max(0, Math.ceil((activeSession.durationMs - elapsed) / 1000))
        setTimeLeft(remaining)
        if (remaining === 0) {
          endSession(false)
        }
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [activeSession])

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const todayStr = today()
    const { data } = await supabase
      .from("social_media_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", todayStr)
      .order("created_at", { ascending: false })

    const txs = data ?? []
    setTransactions(txs)
    setBalance(txs.reduce((s, t) => s + t.minutes, 0))
    setLoading(false)
  }

  async function startTimer() {
    if (balance <= 0) return
    const mins = Math.min(inputMinutes, balance)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const todayStr = today()

    await supabase.from("social_media_transactions").insert({
      user_id: user.id,
      date: todayStr,
      source: "timer_used",
      minutes: -mins,
      description: `${mins} minuten social media gebruikt`,
    })

    const session: TimerSession = {
      startTime: Date.now(),
      durationMs: mins * 60 * 1000,
      minutesDeducted: mins,
    }
    localStorage.setItem(TIMER_KEY, JSON.stringify(session))
    setActiveSession(session)
    setTimeLeft(mins * 60)
    loadData()
  }

  function endSession(manual: boolean) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    localStorage.removeItem(TIMER_KEY)
    setActiveSession(null)
    setTimeLeft(0)
    if (manual) loadData()
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const sourceIcon = (source: string) => {
    if (source === "workout") return <Dumbbell size={12} className="text-orange-400" />
    if (source === "habit") return <CheckSquare size={12} className="text-green-400" />
    if (source === "sleep") return <Moon size={12} className="text-blue-400" />
    return <Clock size={12} className="text-red-400" />
  }

  const earned = transactions.filter((t) => t.minutes > 0).reduce((s, t) => s + t.minutes, 0)
  const used = Math.abs(transactions.filter((t) => t.minutes < 0).reduce((s, t) => s + t.minutes, 0))
  const available = Math.max(0, balance)

  const timerProgress = activeSession
    ? 1 - timeLeft / (activeSession.durationMs / 1000)
    : 0
  const circumference = 2 * Math.PI * 54

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock size={20} className="text-purple-400" /> Social Media Timer
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5">Verdien tijd via productiviteit</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 text-center">
          <div className="text-lg font-bold text-green-400">{formatDuration(earned)}</div>
          <div className="text-[10px] text-neutral-600 mt-0.5">verdiend</div>
        </Card>
        <Card className="p-4 text-center" glow>
          <div className="text-lg font-bold text-white">{formatDuration(available)}</div>
          <div className="text-[10px] text-neutral-600 mt-0.5">beschikbaar</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-lg font-bold text-red-400">{formatDuration(used)}</div>
          <div className="text-[10px] text-neutral-600 mt-0.5">gebruikt</div>
        </Card>
      </div>

      {/* Timer */}
      <Card className="mb-6 p-6">
        {activeSession ? (
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <svg width="128" height="128" className="-rotate-90">
                <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - timerProgress)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white tabular-nums">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
            <p className="text-neutral-500 text-sm mb-4">Timer loopt...</p>
            <Button variant="danger" onClick={() => endSession(true)}>
              <Square size={14} /> Stop timer
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1">{formatDuration(available)}</div>
              <p className="text-neutral-500 text-sm">beschikbaar om te gebruiken</p>
            </div>
            <div className="flex items-center gap-3 w-full max-w-xs">
              <input
                type="range"
                min={5}
                max={Math.max(5, available)}
                step={5}
                value={Math.min(inputMinutes, Math.max(5, available))}
                onChange={(e) => setInputMinutes(Number(e.target.value))}
                className="flex-1 accent-orange-500"
                disabled={available <= 0}
              />
              <span className="text-orange-400 font-medium w-12 text-right">
                {Math.min(inputMinutes, Math.max(5, available))}m
              </span>
            </div>
            <Button
              onClick={startTimer}
              disabled={available <= 0}
              size="lg"
              className="w-full max-w-xs"
            >
              <Play size={16} /> Start timer
            </Button>
            {available <= 0 && (
              <p className="text-neutral-600 text-xs text-center">
                Geen minuten beschikbaar. Log een workout, habit of slaap om minuten te verdienen.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Transactions */}
      <div>
        <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
          Vandaag
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-neutral-600 text-sm text-center py-8">
            Nog niets gelogd vandaag
          </p>
        ) : (
          <div className="space-y-1.5">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.05] px-3 py-2.5"
              >
                {sourceIcon(t.source)}
                <span className="flex-1 text-sm text-neutral-300 truncate">
                  {t.description ?? t.source}
                </span>
                <span
                  className={`text-sm font-medium tabular-nums ${
                    t.minutes > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {t.minutes > 0 ? "+" : ""}
                  {t.minutes}m
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
