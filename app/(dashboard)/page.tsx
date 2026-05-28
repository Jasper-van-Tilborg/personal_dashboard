"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatDuration, calcDurationMinutes, today } from "@/lib/utils"
import { SPLIT_LABELS, type SplitDay, type Habit, type TimeBlock } from "@/types/database"
import Link from "next/link"
import {
  Dumbbell, CheckSquare, Moon, Clock, Scale,
  BookOpen, Calendar, Trophy, CloudSun, Music2,
  ArrowRight, Check,
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

  // Today's schedule
  const [todaySchedule, setTodaySchedule] = useState<TimeBlock[]>([])

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

    const [habitsRes, completionsRes, sleepIncompleteRes, sleepTodayRes, weightRes, txRes, workoutRes, yearWorkoutRes, scheduleRes] =
      await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at"),
        supabase.from("habit_completions").select("habit_id").eq("user_id", user.id).eq("completed_date", todayStr),
        supabase.from("sleep_logs").select("id, sleep_time, created_at").eq("user_id", user.id).is("wake_time", null).gte("created_at", cutoff).order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("sleep_logs").select("sleep_time, wake_time").eq("user_id", user.id).eq("date", todayStr).not("wake_time", "is", null).single(),
        supabase.from("weight_logs").select("weight_kg").eq("user_id", user.id).eq("date", todayStr).single(),
        supabase.from("social_media_transactions").select("minutes").eq("user_id", user.id).eq("date", todayStr),
        supabase.from("workouts").select("split_day, date").eq("user_id", user.id).order("date", { ascending: false }).limit(1),
        supabase.from("workouts").select("id").eq("user_id", user.id).gte("date", yearStart),
        supabase.from("week_schedule").select("time_blocks").eq("user_id", user.id).eq("day_of_week", new Date().getDay()).single(),
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

    if (weightRes.data) setWeight(String(weightRes.data.weight_kg))

    let lunchBonus = 0
    if (new Date().getHours() >= 12) {
      const alreadyHasLunch = (txRes.data ?? []).some((t) => (t as { source?: string }).source === "lunch")
      if (!alreadyHasLunch) {
        await supabase.from("social_media_transactions").insert({
          user_id: user.id,
          date: todayStr,
          source: "lunch",
          minutes: 45,
          description: "Pauze (12:00)",
        })
        lunchBonus = 45
      }
    }

    const balance = (txRes.data ?? []).reduce((s, t) => s + t.minutes, 0) + lunchBonus
    setStats({
      socialBalance: Math.max(0, balance),
      lastWorkout: workoutRes.data?.[0]
        ? { split_day: workoutRes.data[0].split_day as SplitDay, date: workoutRes.data[0].date }
        : null,
      workoutsThisYear: yearWorkoutRes.data?.length ?? 0,
    })

    setTodaySchedule((scheduleRes.data?.time_blocks as TimeBlock[] | null) ?? [])
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

  const { currentBlock, nextBlock } = useMemo(() => {
    if (todaySchedule.length === 0) return { currentBlock: null, nextBlock: null }
    const now = new Date()
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    let idx = -1
    for (let i = 0; i < todaySchedule.length; i++) {
      if (todaySchedule[i].time <= t) idx = i
      else break
    }
    return {
      currentBlock: idx >= 0 ? todaySchedule[idx] : null,
      nextBlock: idx < todaySchedule.length - 1 ? todaySchedule[idx + 1] : null,
    }
  }, [todaySchedule])

  const completedHabits = habits.filter((h) => h.completedToday).length
  const sleepDuration = sleepMode === "complete" ? calcDurationMinutes(sleepTime, wakeTime) : 0

  const appIcons = [
    { href: "/journal",       icon: BookOpen,  label: "Journal",   grad: "from-rose-500 to-pink-700" },
    { href: "/weekschema",    icon: Calendar,  label: "Schema",    grad: "from-cyan-400 to-blue-600" },
    { href: "/social-timer",  icon: Clock,     label: "Timer",     grad: "from-violet-500 to-purple-700" },
    { href: "/motivatie",     icon: Trophy,    label: "Motivatie", grad: "from-yellow-400 to-amber-600" },
    { href: "/weer",          icon: CloudSun,  label: "Weer",      grad: "from-sky-400 to-blue-600" },
    { href: "/spotify",       icon: Music2,    label: "Spotify",   grad: "from-green-400 to-emerald-700" },
  ]

  return (
    <div className="p-4 lg:p-5 max-w-xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting}</h1>
          <p className="text-neutral-500 text-sm mt-0.5 capitalize">
            {new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {stats && (
          <Link href="/social-timer">
            <div className="bg-orange-500/10 border border-orange-500/15 rounded-2xl px-3 py-2 text-right">
              <div className="text-lg font-bold text-orange-400">{formatDuration(stats.socialBalance)}</div>
              <div className="text-[9px] text-orange-600/60 uppercase tracking-wider">social media</div>
            </div>
          </Link>
        )}
      </div>

      <div className="space-y-3">

        {/* Schedule widget */}
        {todaySchedule.length > 0 && (
          <Link href="/weekschema" className="block">
            <div className="rounded-3xl bg-gradient-to-br from-amber-950/50 to-yellow-900/10 border border-amber-900/20 p-4 hover:from-amber-950/60 transition-colors">
              <div className="flex items-center gap-1.5 mb-3">
                <Calendar size={10} className="text-amber-500" />
                <span className="text-[10px] text-amber-500/70 font-semibold uppercase tracking-wider">Schema vandaag</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {currentBlock ? (
                  <div className={`rounded-2xl px-3 py-2.5 border text-xs ${currentBlock.color}`}>
                    <div className="opacity-50 mb-1 text-[9px] uppercase tracking-wider">Nu</div>
                    <div className="font-semibold leading-snug">{currentBlock.activity}</div>
                  </div>
                ) : (
                  <div className="rounded-2xl px-3 py-2.5 bg-white/[0.02] border border-white/[0.04] text-xs text-neutral-700">
                    Geen activiteit
                  </div>
                )}
                {nextBlock && (
                  <div className="rounded-2xl px-3 py-2.5 bg-white/[0.02] border border-white/[0.04] text-xs">
                    <div className="text-neutral-600 mb-1 text-[9px] uppercase tracking-wider">{nextBlock.time}</div>
                    <div className="text-neutral-400 font-medium leading-snug">{nextBlock.activity}</div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Habits widget */}
        <div className="rounded-3xl bg-gradient-to-br from-green-950/60 to-green-900/10 border border-green-900/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <CheckSquare size={11} className="text-green-400" />
              <span className="text-[10px] text-green-400/80 font-semibold uppercase tracking-wider">Habits</span>
            </div>
            <div className="flex items-center gap-3">
              {habits.length > 0 && (
                <span className="text-[10px] text-green-700">{completedHabits}/{habits.length}</span>
              )}
              <Link href="/habits" className="text-green-900 hover:text-green-700 transition-colors">
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {habits.length > 0 && (
            <div className="h-[3px] rounded-full bg-green-900/30 overflow-hidden mb-3">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700"
                style={{ width: `${(completedHabits / habits.length) * 100}%` }}
              />
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-2xl bg-white/[0.02] animate-pulse" />)}
            </div>
          ) : habits.length === 0 ? (
            <Link href="/habits" className="block text-xs text-green-900 hover:text-green-700 transition-colors py-1">
              + Eerste habit toevoegen
            </Link>
          ) : (
            <div className="space-y-1.5">
              {habits.map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit)}
                  disabled={togglingHabit === habit.id}
                  className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-150 text-left ${
                    habit.completedToday
                      ? "bg-green-500/10 border border-green-500/20"
                      : "bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08]"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    habit.completedToday ? "bg-green-500 border-green-500" : "border-white/20"
                  }`}>
                    {habit.completedToday && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-base shrink-0">{habit.icon}</span>
                  <span className={`text-sm flex-1 ${habit.completedToday ? "text-neutral-600 line-through" : "text-white"}`}>
                    {habit.name}
                  </span>
                  {habit.social_media_minutes > 0 && (
                    <span className="text-[10px] text-orange-500/40">+{habit.social_media_minutes}m</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sleep + Weight */}
        <div className="grid grid-cols-2 gap-3">

          {/* Sleep */}
          <div className="rounded-3xl bg-gradient-to-br from-blue-950/70 to-indigo-900/20 border border-blue-900/25 p-4 min-h-[180px] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Moon size={11} className="text-blue-400" />
                <span className="text-[10px] text-blue-400/80 font-semibold uppercase tracking-wider">Slaap</span>
              </div>
              <Link href="/sleep" className="text-blue-900 hover:text-blue-700 transition-colors">
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="flex flex-col flex-1 justify-end gap-2 mt-3">
              {sleepMode === "sleeping" && sleepIncomplete ? (
                <>
                  <p className="text-[10px] text-blue-400/40">Sliep om {sleepIncomplete.sleep_time.slice(0, 5)}</p>
                  <button
                    onClick={wakeUp}
                    disabled={sleepSaving}
                    className="w-full rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 active:scale-95 border border-blue-500/20 py-2.5 text-blue-300 text-xs font-medium transition-all"
                  >
                    {sleepSaved ? "Klaar!" : sleepSaving ? "..." : "Wakker"}
                  </button>
                </>
              ) : sleepMode === "complete" ? (
                <>
                  <div className={`text-3xl font-bold ${sleepDuration >= 420 ? "text-green-400" : "text-orange-400"}`}>
                    {formatDuration(sleepDuration)}
                  </div>
                  <p className="text-[10px] text-blue-400/35">{sleepTime} → {wakeTime}</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={sleepTime}
                      onChange={(e) => setSleepTime(e.target.value)}
                      className="flex-1 bg-blue-900/20 border border-blue-900/30 rounded-xl px-2 py-1.5 text-xs text-white text-center focus:outline-none min-w-0"
                    />
                    <button
                      onClick={() => setSleepTime(new Date().toTimeString().slice(0, 5))}
                      className="text-[9px] text-blue-400/40 hover:text-blue-400/70 transition-colors shrink-0"
                    >
                      Nu
                    </button>
                  </div>
                  <button
                    onClick={goToSleep}
                    disabled={sleepSaving}
                    className="w-full rounded-2xl bg-blue-500/15 hover:bg-blue-500/25 active:scale-95 border border-blue-500/20 py-2.5 text-blue-300 text-xs font-medium transition-all"
                  >
                    {sleepSaving ? "..." : "Slapen"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Weight */}
          <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800/40 border border-white/[0.05] p-4 min-h-[180px] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Scale size={11} className="text-neutral-400" />
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Gewicht</span>
              </div>
              <Link href="/weight" className="text-neutral-700 hover:text-neutral-500 transition-colors">
                <ArrowRight size={12} />
              </Link>
            </div>
            <div className="flex flex-col flex-1 justify-end gap-2 mt-3">
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  placeholder="—"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  step={0.1}
                  min={0}
                  onKeyDown={(e) => e.key === "Enter" && saveWeight()}
                  className="bg-transparent text-3xl font-bold text-white w-full focus:outline-none placeholder:text-neutral-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-neutral-600 text-sm shrink-0">kg</span>
              </div>
              <button
                onClick={saveWeight}
                disabled={weightSaving || !weight}
                className="w-full rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] active:scale-95 border border-white/[0.08] py-2.5 text-neutral-400 text-xs font-medium transition-all disabled:opacity-40"
              >
                {weightSaved ? "Opgeslagen!" : weightSaving ? "..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>

        {/* Gym widget */}
        <div className="rounded-3xl bg-gradient-to-br from-orange-950/60 to-amber-900/10 border border-orange-900/20 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Dumbbell size={11} className="text-orange-400" />
                <span className="text-[10px] text-orange-400/80 font-semibold uppercase tracking-wider">Gym</span>
              </div>
              {stats?.lastWorkout ? (
                <p className="text-xs text-neutral-500">
                  {SPLIT_LABELS[stats.lastWorkout.split_day]} ·{" "}
                  {new Date(stats.lastWorkout.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              ) : (
                <p className="text-xs text-neutral-700">Nog geen workouts</p>
              )}
            </div>
            {stats && (
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{stats.workoutsThisYear}</div>
                <div className="text-[9px] text-neutral-600 uppercase tracking-wider">dit jaar</div>
              </div>
            )}
          </div>
          <Link href="/gym" className="block mt-1">
            <div className="rounded-2xl bg-orange-500/15 hover:bg-orange-500/25 active:scale-[0.98] border border-orange-500/20 px-4 py-2.5 text-center transition-all cursor-pointer">
              <span className="text-sm font-semibold text-orange-300">Workout loggen</span>
            </div>
          </Link>
        </div>

        {/* App icons — iOS style */}
        <div className="pt-1 pb-2">
          <div className="grid grid-cols-6 gap-3">
            {appIcons.map(({ href, icon: Icon, label, grad }) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-1.5">
                <div className={`w-full aspect-square rounded-[22%] bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg shadow-black/30`}>
                  <Icon size={20} className="text-white" strokeWidth={1.75} />
                </div>
                <span className="text-[9px] text-neutral-500 text-center">{label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
