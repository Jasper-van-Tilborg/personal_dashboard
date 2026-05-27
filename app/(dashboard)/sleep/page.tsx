"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SleepChart } from "@/components/sleep/SleepChart"
import type { SleepLog } from "@/types/database"
import { today, calcDurationMinutes, formatDuration } from "@/lib/utils"
import { Moon, Check } from "lucide-react"

export default function SleepPage() {
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(today())
  const [sleepTime, setSleepTime] = useState("23:00")
  const [wakeTime, setWakeTime] = useState("07:00")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30)

    setLogs(data ?? [])

    const todayEntry = (data ?? []).find((l) => l.date === today())
    if (todayEntry) {
      setSleepTime(todayEntry.sleep_time.slice(0, 5))
      setWakeTime(todayEntry.wake_time.slice(0, 5))
      setNotes(todayEntry.notes ?? "")
    }

    setLoading(false)
  }

  const duration = calcDurationMinutes(sleepTime, wakeTime)
  const isGood = duration >= 420

  async function saveSleep() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const todayStr = today()
    const isToday = date === todayStr

    const { data: existing } = await supabase
      .from("sleep_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", date)
      .single()

    if (existing) {
      await supabase
        .from("sleep_logs")
        .update({ sleep_time: sleepTime, wake_time: wakeTime, duration_minutes: duration, notes: notes || null })
        .eq("id", existing.id)
    } else {
      await supabase.from("sleep_logs").insert({
        user_id: user.id,
        date,
        sleep_time: sleepTime,
        wake_time: wakeTime,
        duration_minutes: duration,
        notes: notes || null,
      })

      if (isGood && isToday) {
        const { data: existingTx } = await supabase
          .from("social_media_transactions")
          .select("id")
          .eq("user_id", user.id)
          .eq("source", "sleep")
          .eq("date", todayStr)
          .single()

        if (!existingTx) {
          await supabase.from("social_media_transactions").insert({
            user_id: user.id,
            date: todayStr,
            source: "sleep",
            minutes: 20,
            description: `Goede nacht: ${formatDuration(duration)} geslapen`,
          })
        }
      }
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
    loadLogs()
  }

  const avgDuration =
    logs.length > 0
      ? logs.slice(0, 7).reduce((s, l) => s + l.duration_minutes, 0) / Math.min(7, logs.length)
      : 0

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Moon size={20} className="text-blue-400" /> Slaap Tracker
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5">7+ uur = +20 social media min</p>
      </div>

      {/* Stats */}
      {!loading && logs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-xs text-neutral-500 mb-1">Gemiddeld (7d)</div>
            <div className={`text-2xl font-bold ${avgDuration >= 420 ? "text-green-400" : "text-orange-400"}`}>
              {formatDuration(Math.round(avgDuration))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-neutral-500 mb-1">Gisternacht</div>
            <div className={`text-2xl font-bold ${(logs[0]?.duration_minutes ?? 0) >= 420 ? "text-green-400" : "text-orange-400"}`}>
              {logs[0] ? formatDuration(logs[0].duration_minutes) : "—"}
            </div>
          </Card>
        </div>
      )}

      {/* Log form */}
      <Card className="p-4 space-y-4">
        {/* Time pickers — primary action, large touch targets */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-2">Inslaaptijd</label>
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => setSleepTime(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-4 text-xl font-semibold text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/40 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-2">Opstaatijd</label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-4 text-xl font-semibold text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Duration feedback */}
        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border transition-colors ${
          isGood
            ? "bg-green-500/[0.06] border-green-500/20"
            : "bg-white/[0.03] border-white/[0.07]"
        }`}>
          <div className="flex items-center gap-2">
            <Moon size={15} className={isGood ? "text-green-400" : "text-neutral-500"} />
            <span className={`text-base font-semibold ${isGood ? "text-green-400" : "text-white"}`}>
              {formatDuration(duration)}
            </span>
            <span className="text-xs text-neutral-600">geslapen</span>
          </div>
          {isGood && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Check size={12} /> +20 min
            </span>
          )}
        </div>

        {/* Secondary: date + notes */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Datum</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Notitie</label>
            <Input
              placeholder="Optioneel"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={saveSleep} disabled={saving} className="w-full py-3">
          {saved ? (
            <span className="flex items-center gap-2"><Check size={15} /> Opgeslagen!</span>
          ) : saving ? (
            "Opslaan..."
          ) : (
            "Opslaan"
          )}
        </Button>
      </Card>

      {/* Chart */}
      <Card className="p-4">
        <div className="text-xs text-neutral-500 mb-3">Afgelopen 2 weken</div>
        {loading ? (
          <div className="h-40 bg-white/[0.02] rounded-xl animate-pulse" />
        ) : (
          <SleepChart logs={logs} />
        )}
      </Card>
    </div>
  )
}
