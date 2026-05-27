"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SleepChart } from "@/components/sleep/SleepChart"
import type { SleepLog } from "@/types/database"
import { today, calcDurationMinutes, formatDuration } from "@/lib/utils"
import { Moon, Plus, Check } from "lucide-react"

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
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("sleep_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30)

    setLogs(data ?? [])

    // Prefill with today's entry if exists
    const todayEntry = (data ?? []).find((l) => l.date === today())
    if (todayEntry) {
      setSleepTime(todayEntry.sleep_time.slice(0, 5))
      setWakeTime(todayEntry.wake_time.slice(0, 5))
      setNotes(todayEntry.notes ?? "")
    }

    setLoading(false)
  }

  const duration = calcDurationMinutes(sleepTime, wakeTime)

  async function saveSleep() {
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const goodSleep = duration >= 420
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
        .update({
          sleep_time: sleepTime,
          wake_time: wakeTime,
          duration_minutes: duration,
          notes: notes || null,
        })
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

      if (goodSleep && isToday) {
        // Check if already rewarded
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
      ? logs.slice(0, 7).reduce((s, l) => s + l.duration_minutes, 0) /
        Math.min(7, logs.length)
      : 0

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Moon size={20} className="text-blue-400" /> Slaap Tracker
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5">7+ uur = +20 social media min</p>
      </div>

      {/* Stats */}
      {!loading && logs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Card className="p-4">
            <div className="text-xs text-neutral-500 mb-1">Gemiddeld (7d)</div>
            <div
              className={`text-xl font-bold ${
                avgDuration >= 420 ? "text-green-400" : "text-orange-400"
              }`}
            >
              {formatDuration(Math.round(avgDuration))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-neutral-500 mb-1">Gisternacht</div>
            <div
              className={`text-xl font-bold ${
                (logs[0]?.duration_minutes ?? 0) >= 420
                  ? "text-green-400"
                  : "text-orange-400"
              }`}
            >
              {logs[0] ? formatDuration(logs[0].duration_minutes) : "—"}
            </div>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card className="mb-5 p-4">
        <div className="text-xs text-neutral-500 mb-3">Afgelopen 2 weken</div>
        {loading ? (
          <div className="h-40 bg-white/[0.02] rounded-xl animate-pulse" />
        ) : (
          <SleepChart logs={logs} />
        )}
      </Card>

      {/* Log form */}
      <Card>
        <CardHeader>
          <CardTitle>Slaap loggen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Datum</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Inslaaptijd</label>
              <Input
                type="time"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Opstaagtijd</label>
              <Input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.07] px-4 py-3">
            <Moon size={16} className={duration >= 420 ? "text-green-400" : "text-orange-400"} />
            <span className="text-sm text-white">
              {formatDuration(duration)} geslapen
            </span>
            {duration >= 420 && (
              <span className="text-xs text-green-400 ml-auto flex items-center gap-1">
                <Check size={12} /> Goed!
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">
              Notities (optioneel)
            </label>
            <Input
              placeholder="Hoe goed geslapen?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            onClick={saveSleep}
            disabled={saving}
            className="w-full"
          >
            {saved ? (
              <>
                <Check size={14} /> Opgeslagen!
              </>
            ) : saving ? (
              "Opslaan..."
            ) : (
              <>
                <Plus size={14} /> Opslaan
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
