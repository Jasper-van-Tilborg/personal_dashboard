"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDuration, calcDurationMinutes, today } from "@/lib/utils"
import { SPLIT_LABELS, type SplitDay, type Habit } from "@/types/database"
import Link from "next/link"
import {
  Dumbbell, CheckSquare, Moon, Clock, Scale,
  BookOpen, Calendar, Trophy, CloudSun, Music2,
  Flame, ArrowRight, Check, Sun,
} from "lucide-react"

interface HabitWithState extends Habit {
  completedToday: boolean
}

interface Stats {
  socialBalance: number
  lastWorkout: { split_day: SplitDay; date: string } | null
  workoutsThisYear: number
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("")
  const [loading, setLoading] = useState(true)

  // Habits
  const [habits, setHabits] = useState<HabitWithState[]>([])
  const [togglingHabit, setTogglingHabit] = useState<string | null>(null)

  // Sleep
  const [sleepMode, setSleepMode] = useState<"going_to_sleep" | "sleeping" | "complete">("going_to_sleep")
  const [sleepIncomplete, setSleepIncomplete] = useState<{ id: string; sleep_time: string; created_at: string } | null>(null)
  const [sleepTime, setSleepTime] = useState(new Date().toTimeString().slice(0, 5))
  const [wakeTime, setWakeTime] = useState("07:00")
  const [sleepSaving, setSleepSaving] = useState(false)
  const [sleepSaved, setSleepSaved] = useState(false)

  // Weight
  const [weight, setWeight] = useState("")
  const [weightSaving, setWeightSaving] = useState(false)
  const [weightSaved, setWeightSaved] = useState(false)

  // Stats
  const [stats, setStats] = useState<Stats | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond")
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const todayStr = today()
    const yearStart = `${new Date().getFullYear()}-01-01`

    const cutoff = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()

    const [habitsRes, completionsRes, sleepIncompleteRes, sleepTodayRes, weightRes, txRes, workoutRes, yearWorkoutRes] =
      await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at"),
        supabase.from("habit_completions").select("habit_id").eq("user_id", user.id).eq("completed_date", todayStr),
        supabase.from("sleep_logs").select("id, sleep_time, created_at").eq("user_id", user.id).is("wake_time", null).gte("created_at", cutoff).order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("sleep_logs").select("sleep_time, wake_time").eq("user_id", user.id).eq("date", todayStr).not("wake_time", "is", null).single(),
        supabase.from("weight_logs").select("weight_kg").eq("user_id", user.id).eq("date", todayStr).single(),
        supabase.from("social_media_transactions").select("minutes").eq("user_id", user.id).eq("date", todayStr),
        supabase.from("workouts").select("split_day, date").eq("user_id", user.id).order("date", { ascending: false }).limit(1),
        supabase.from("workouts").select("id").eq("user_id", user.id).gte("date", yearStart),
      ])

    const completedIds = new Set((completionsRes.data ?? []).map((c) => c.habit_id))
    setHabits(
      (habitsRes.data ?? []).map((h) => ({ ...h, completedToday: completedIds.has(h.id) }))
    )

    if (sleepIncompleteRes.data) {
      setSleepIncomplete(sleepIncompleteRes.data)
      setSleepMode("sleeping")
    } else if (sleepTodayRes.data) {
      setSleepTime(sleepTodayRes.data.sleep_time.slice(0, 5))
      setWakeTime(sleepTodayRes.data.wake_time!.slice(0, 5))
      setSleepMode("complete")
    } else {
      setSleepMode("going_to_sleep")
    }

    if (weightRes.data) {
      setWeight(String(weightRes.data.weight_kg))
    }

    const balance = (txRes.data ?? []).reduce((s, t) => s + t.minutes, 0)
    setStats({
      socialBalance: Math.max(0, balance),
      lastWorkout: workoutRes.data?.[0]
        ? { split_day: workoutRes.data[0].split_day as SplitDay, date: workoutRes.data[0].date }
        : null,
      workoutsThisYear: yearWorkoutRes.data?.length ?? 0,
    })

    setLoading(false)
  }

  async function toggleHabit(habit: HabitWithState) {
    setTogglingHabit(habit.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const todayStr = today()

    if (habit.completedToday) {
      await supabase.from("habit_completions").delete()
        .eq("habit_id", habit.id).eq("completed_date", todayStr)
      await supabase.from("social_media_transactions").delete()
        .eq("source", "habit").eq("source_ref_id", habit.id).eq("date", todayStr)
    } else {
      await supabase.from("habit_completions").insert({
        habit_id: habit.id, user_id: user.id, completed_date: todayStr,
      })
      if (habit.social_media_minutes > 0) {
        await supabase.from("social_media_transactions").insert({
          user_id: user.id, date: todayStr, source: "habit",
          source_ref_id: habit.id, minutes: habit.social_media_minutes,
          description: `Habit: ${habit.name}`,
        })
      }
    }

    setHabits((prev) =>
      prev.map((h) => h.id === habit.id ? { ...h, completedToday: !h.completedToday } : h)
    )
    setTogglingHabit(null)
  }

  async function goToSleep() {
    setSleepSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from("sleep_logs").insert({
      user_id: user.id,
      date: today(),
      sleep_time: sleepTime,
      wake_time: null,
      duration_minutes: null,
    }).select("id, sleep_time, created_at").single()

    setSleepSaving(false)
    if (data) {
      setSleepIncomplete(data)
      setSleepMode("sleeping")
    }
  }

  async function wakeUp() {
    if (!sleepIncomplete) return
    setSleepSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const wake = new Date().toTimeString().slice(0, 5)
    const duration = calcDurationMinutes(sleepIncomplete.sleep_time.slice(0, 5), wake)

    await supabase.from("sleep_logs").update({ wake_time: wake, duration_minutes: duration })
      .eq("id", sleepIncomplete.id)

    if (duration >= 420) {
      await supabase.from("social_media_transactions").insert({
        user_id: user.id, date: today(), source: "sleep",
        minutes: 20, description: `Goede nacht: ${formatDuration(duration)} geslapen`,
      })
    }

    setSleepSaving(false)
    setSleepSaved(true)
    setSleepMode("complete")
    setSleepIncomplete(null)
    setTimeout(() => setSleepSaved(false), 2000)
  }

  async function saveWeight() {
    if (!weight || isNaN(Number(weight))) return
    setWeightSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("weight_logs").upsert(
      { user_id: user.id, date: today(), weight_kg: Number(weight) },
      { onConflict: "user_id,date" }
    )

    setWeightSaving(false)
    setWeightSaved(true)
    setTimeout(() => setWeightSaved(false), 2000)
  }

  const completedHabits = habits.filter((h) => h.completedToday).length

  const quickLinks = [
    { href: "/journal", icon: BookOpen, label: "Journal", color: "text-pink-400" },
    { href: "/weekschema", icon: Calendar, label: "Schema", color: "text-cyan-400" },
    { href: "/social-timer", icon: Clock, label: "Timer", color: "text-purple-400" },
    { href: "/motivatie", icon: Trophy, label: "Motivatie", color: "text-yellow-400" },
    { href: "/weer", icon: CloudSun, label: "Weer", color: "text-blue-400" },
    { href: "/spotify", icon: Music2, label: "Spotify", color: "text-green-400" },
  ]

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting}</h1>
          <p className="text-neutral-500 text-sm mt-0.5 capitalize">
            {new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {stats && (
          <Link href="/social-timer">
            <div className="text-right">
              <div className="text-xl font-bold text-orange-400">{formatDuration(stats.socialBalance)}</div>
              <div className="text-[10px] text-neutral-600">social media verdiend</div>
            </div>
          </Link>
        )}
      </div>

      {/* Habits widget */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare size={15} className="text-green-400" />
            <span className="text-sm font-medium text-white">Habits</span>
          </div>
          <div className="flex items-center gap-3">
            {habits.length > 0 && (
              <span className="text-xs text-neutral-500">
                {completedHabits}/{habits.length}
              </span>
            )}
            <Link href="/habits" className="text-neutral-600 hover:text-neutral-400 transition-colors">
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        {habits.length > 0 && (
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-3">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedHabits / habits.length) * 100}%` }}
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 rounded-lg bg-white/[0.02] animate-pulse" />)}
          </div>
        ) : habits.length === 0 ? (
          <Link href="/habits" className="block text-xs text-neutral-600 hover:text-neutral-400 transition-colors py-1">
            + Eerste habit toevoegen
          </Link>
        ) : (
          <div className="space-y-1.5">
            {habits.map((habit) => (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit)}
                disabled={togglingHabit === habit.id}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 text-left ${
                  habit.completedToday
                    ? "bg-green-500/[0.07] border border-green-500/15"
                    : "bg-white/[0.02] border border-white/[0.05] hover:border-white/10"
                }`}
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                  habit.completedToday ? "bg-green-500 border-green-500" : "border-white/20"
                }`}>
                  {habit.completedToday && <Check size={11} className="text-white" />}
                </div>
                <span className="text-lg shrink-0">{habit.icon}</span>
                <span className={`text-sm flex-1 ${habit.completedToday ? "text-neutral-500 line-through" : "text-white"}`}>
                  {habit.name}
                </span>
                {habit.social_media_minutes > 0 && (
                  <span className="text-[10px] text-orange-500/60">+{habit.social_media_minutes}m</span>
                )}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Sleep + Weight row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Sleep widget */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Moon size={15} className="text-blue-400" />
              <span className="text-sm font-medium text-white">Slaap</span>
            </div>
            <Link href="/sleep" className="text-neutral-600 hover:text-neutral-400 transition-colors">
              <ArrowRight size={14} />
            </Link>
          </div>

          {sleepMode === "sleeping" && sleepIncomplete ? (
            <div className="space-y-3">
              <div className="text-center py-1">
                <p className="text-xs text-neutral-500">Slaap gestart om {sleepIncomplete.sleep_time.slice(0, 5)}</p>
              </div>
              <Button onClick={wakeUp} disabled={sleepSaving} className="w-full" size="sm">
                {sleepSaved ? <><Check size={13} /> Opgeslagen!</> : sleepSaving ? "..." : <><Sun size={13} /> Ik ben wakker</>}
              </Button>
            </div>
          ) : sleepMode === "complete" ? (
            <div className="text-center py-1">
              <p className={`text-xl font-bold ${calcDurationMinutes(sleepTime, wakeTime) >= 420 ? "text-green-400" : "text-orange-400"}`}>
                {formatDuration(calcDurationMinutes(sleepTime, wakeTime))}
              </p>
              <p className="text-xs text-neutral-600 mt-0.5">{sleepTime} → {wakeTime}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-neutral-600">Inslaaptijd</label>
                  <button onClick={() => setSleepTime(new Date().toTimeString().slice(0, 5))} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">Nu</button>
                </div>
                <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-2 py-2.5 text-sm font-semibold text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors" />
              </div>
              <Button onClick={goToSleep} disabled={sleepSaving} className="w-full" size="sm">
                {sleepSaving ? "..." : <><Moon size={13} /> Ik ga slapen</>}
              </Button>
            </div>
          )}
        </Card>

        {/* Weight quick-log */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale size={15} className="text-neutral-400" />
              <span className="text-sm font-medium text-white">Gewicht</span>
            </div>
            <Link href="/weight" className="text-neutral-600 hover:text-neutral-400 transition-colors">
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mb-3">
            <label className="block text-[10px] text-neutral-600 mb-1">Kilogram</label>
            <Input
              type="number"
              placeholder="75.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              step={0.1}
              min={0}
              className="text-center text-lg font-semibold py-2.5"
              onKeyDown={(e) => e.key === "Enter" && saveWeight()}
            />
          </div>
          <Button onClick={saveWeight} disabled={weightSaving || !weight} className="w-full" size="sm">
            {weightSaved ? <><Check size={13} /> Opgeslagen!</> : weightSaving ? "..." : "Opslaan"}
          </Button>
        </Card>
      </div>

      {/* Gym widget */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Dumbbell size={16} className="text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Gym</div>
              {stats?.lastWorkout ? (
                <div className="text-xs text-neutral-500 mt-0.5">
                  {SPLIT_LABELS[stats.lastWorkout.split_day]} •{" "}
                  {new Date(stats.lastWorkout.date).toLocaleDateString("nl-NL", {
                    weekday: "short", day: "numeric", month: "short",
                  })}
                </div>
              ) : (
                <div className="text-xs text-neutral-600">Nog geen workouts</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="text-right">
                <div className="text-sm font-bold text-white">{stats.workoutsThisYear}</div>
                <div className="text-[10px] text-neutral-600">dit jaar</div>
              </div>
            )}
            <Link href="/gym">
              <Button size="sm">
                <Flame size={13} /> Loggen
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Quick nav */}
      <div>
        <p className="text-[10px] text-neutral-600 uppercase tracking-widest mb-2">Meer</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {quickLinks.map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}>
              <Card className="p-3 hover:bg-white/[0.06] transition-all cursor-pointer text-center">
                <Icon size={18} className={`${color} mx-auto mb-1`} />
                <span className="text-[10px] text-neutral-500">{label}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
