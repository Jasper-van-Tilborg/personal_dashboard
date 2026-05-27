"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SleepChart } from "@/components/sleep/SleepChart"
import type { SleepLog } from "@/types/database"
import { today, calcDurationMinutes, formatDuration } from "@/lib/utils"
import { Moon, Sun, Check, Pencil } from "lucide-react"

type Mode = "going_to_sleep" | "sleeping" | "complete"

function nowTime() {
  return new Date().toTimeString().slice(0, 5)
}

function timeSince(isoString: string) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
  if (diff < 60) return `${diff} min geleden`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m > 0 ? `${h}u ${m}m geleden` : `${h}u geleden`
}

export default function SleepPage() {
  const [mode, setMode] = useState<Mode>("going_to_sleep")
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [loading, setLoading] = useState(true)

  // Incomplete entry (sleeping state)
  const [incompleteEntry, setIncompleteEntry] = useState<SleepLog | null>(null)

  // Going to sleep form
  const [sleepTime, setSleepTime] = useState(nowTime())

  // Complete / edit form
  const [editSleepTime, setEditSleepTime] = useState("23:00")
  const [editWakeTime, setEditWakeTime] = useState("07:00")
  const [showEdit, setShowEdit] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const cutoff = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()

    const [logsRes, incompleteRes] = await Promise.all([
      supabase.from("sleep_logs").select("*").eq("user_id", user.id)
        .order("date", { ascending: false }).limit(30),
      supabase.from("sleep_logs").select("*").eq("user_id", user.id)
        .is("wake_time", null).gte("created_at", cutoff)
        .order("created_at", { ascending: false }).limit(1).single(),
    ])

    const allLogs = logsRes.data ?? []
    setLogs(allLogs)

    if (incompleteRes.data) {
      setIncompleteEntry(incompleteRes.data)
      setMode("sleeping")
    } else {
      const todayEntry = allLogs.find((l) => l.date === today() && l.wake_time !== null)
      if (todayEntry) {
        setEditSleepTime(todayEntry.sleep_time.slice(0, 5))
        setEditWakeTime(todayEntry.wake_time!.slice(0, 5))
        setMode("complete")
      } else {
        setMode("going_to_sleep")
      }
    }

    setLoading(false)
  }

  async function handleGoToSleep() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from("sleep_logs").insert({
      user_id: user.id,
      date: today(),
      sleep_time: sleepTime,
      wake_time: null,
      duration_minutes: null,
    }).select().single()

    setSaving(false)
    if (data) {
      setIncompleteEntry(data)
      setMode("sleeping")
    }
  }

  async function handleWakeUp() {
    if (!incompleteEntry) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const wakeTime = nowTime()
    const duration = calcDurationMinutes(incompleteEntry.sleep_time.slice(0, 5), wakeTime)

    await supabase.from("sleep_logs").update({
      wake_time: wakeTime,
      duration_minutes: duration,
    }).eq("id", incompleteEntry.id)

    if (duration >= 420) {
      const { data: existingTx } = await supabase.from("social_media_transactions")
        .select("id").eq("user_id", user.id).eq("source", "sleep")
        .eq("date", incompleteEntry.date).single()

      if (!existingTx) {
        await supabase.from("social_media_transactions").insert({
          user_id: user.id,
          date: incompleteEntry.date,
          source: "sleep",
          minutes: 20,
          description: `Goede nacht: ${formatDuration(duration)} geslapen`,
        })
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setIncompleteEntry(null)
    loadLogs()
  }

  async function saveEdit() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const duration = calcDurationMinutes(editSleepTime, editWakeTime)
    const todayEntry = logs.find((l) => l.date === today())

    if (todayEntry) {
      await supabase.from("sleep_logs").update({
        sleep_time: editSleepTime,
        wake_time: editWakeTime,
        duration_minutes: duration,
      }).eq("id", todayEntry.id)
    } else {
      await supabase.from("sleep_logs").insert({
        user_id: user.id,
        date: today(),
        sleep_time: editSleepTime,
        wake_time: editWakeTime,
        duration_minutes: duration,
      })
    }

    setSaving(false)
    setShowEdit(false)
    loadLogs()
  }

  const avgDuration =
    logs.filter((l) => l.duration_minutes).length > 0
      ? logs.filter((l) => l.duration_minutes).slice(0, 7)
          .reduce((s, l) => s + (l.duration_minutes ?? 0), 0) /
        Math.min(7, logs.filter((l) => l.duration_minutes).length)
      : 0

  const todayComplete = mode === "complete"
    ? logs.find((l) => l.date === today() && l.wake_time)
    : null

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Moon size={20} className="text-blue-400" /> Slaap Tracker
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5">7+ uur = +20 social media min</p>
      </div>

      {/* Stats */}
      {!loading && logs.filter((l) => l.duration_minutes).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-xs text-neutral-500 mb-1">Gemiddeld (7d)</div>
            <div className={`text-2xl font-bold ${avgDuration >= 420 ? "text-green-400" : "text-orange-400"}`}>
              {formatDuration(Math.round(avgDuration))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-neutral-500 mb-1">Gisternacht</div>
            <div className={`text-2xl font-bold ${(logs.find(l => l.duration_minutes)?.duration_minutes ?? 0) >= 420 ? "text-green-400" : "text-orange-400"}`}>
              {logs.find(l => l.duration_minutes)
                ? formatDuration(logs.find(l => l.duration_minutes)!.duration_minutes!)
                : "—"}
            </div>
          </Card>
        </div>
      )}

      {/* Main action card */}
      {loading ? (
        <div className="h-40 rounded-2xl bg-white/[0.03] animate-pulse" />
      ) : mode === "sleeping" && incompleteEntry ? (
        // === SLEEPING STATE ===
        <Card className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
            <Moon size={28} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white font-medium">Goed slapen!</p>
            <p className="text-neutral-500 text-sm mt-1">
              Geslapen vanaf {incompleteEntry.sleep_time.slice(0, 5)}
            </p>
            <p className="text-neutral-600 text-xs mt-0.5">
              {timeSince(incompleteEntry.created_at)}
            </p>
          </div>
          <Button onClick={handleWakeUp} disabled={saving} className="w-full py-3">
            {saved ? (
              <><Check size={15} /> Welterusten was het!</>
            ) : saving ? "Opslaan..." : (
              <><Sun size={15} /> Ik ben wakker</>
            )}
          </Button>
        </Card>
      ) : mode === "complete" && todayComplete && !showEdit ? (
        // === COMPLETE STATE ===
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Sun size={22} className={todayComplete.duration_minutes! >= 420 ? "text-green-400" : "text-orange-400"} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${todayComplete.duration_minutes! >= 420 ? "text-green-400" : "text-orange-400"}`}>
                  {formatDuration(todayComplete.duration_minutes!)}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {todayComplete.sleep_time.slice(0, 5)} → {todayComplete.wake_time!.slice(0, 5)}
                  {todayComplete.duration_minutes! >= 420 && (
                    <span className="text-green-500 ml-2">+20 min</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowEdit(true)}
              className="p-2 text-neutral-600 hover:text-white transition-colors"
            >
              <Pencil size={14} />
            </button>
          </div>
        </Card>
      ) : mode === "complete" && showEdit ? (
        // === EDIT STATE ===
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Aanpassen</span>
            <button onClick={() => setShowEdit(false)} className="text-xs text-neutral-600 hover:text-neutral-400">
              Annuleren
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-neutral-500">Inslaaptijd</label>
                <button onClick={() => setEditSleepTime(nowTime())} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">Nu</button>
              </div>
              <input type="time" value={editSleepTime} onChange={(e) => setEditSleepTime(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-4 text-xl font-semibold text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-neutral-500">Opstaatijd</label>
                <button onClick={() => setEditWakeTime(nowTime())} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">Nu</button>
              </div>
              <input type="time" value={editWakeTime} onChange={(e) => setEditWakeTime(e.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-4 text-xl font-semibold text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors" />
            </div>
          </div>
          <Button onClick={saveEdit} disabled={saving} className="w-full">
            {saving ? "Opslaan..." : "Opslaan"}
          </Button>
        </Card>
      ) : (
        // === GOING TO SLEEP STATE ===
        <Card className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-neutral-500">Inslaaptijd</label>
              <button onClick={() => setSleepTime(nowTime())} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">Nu</button>
            </div>
            <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-4 text-xl font-semibold text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors" />
          </div>
          <Button onClick={handleGoToSleep} disabled={saving} className="w-full py-3">
            {saving ? "Opslaan..." : <><Moon size={15} /> Ik ga slapen</>}
          </Button>
        </Card>
      )}

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
