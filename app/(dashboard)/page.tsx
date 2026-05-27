"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDuration, today } from "@/lib/utils"
import { SPLIT_LABELS, type SplitDay } from "@/types/database"
import Link from "next/link"
import {
  Dumbbell,
  CheckSquare,
  Moon,
  Clock,
  Trophy,
  TrendingUp,
  Flame,
  ArrowRight,
} from "lucide-react"

interface DashboardStats {
  socialBalance: number
  habitsToday: { completed: number; total: number }
  lastSleep: { duration: number; date: string } | null
  lastWorkout: { split_day: SplitDay; date: string } | null
  longestStreak: { habit: string; streak: number } | null
  workoutsThisYear: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [greeting, setGreeting] = useState("")
  const supabase = createClient()

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting("Goedemorgen")
    else if (h < 18) setGreeting("Goedemiddag")
    else setGreeting("Goedenavond")

    loadStats()
  }, [])

  async function loadStats() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const todayStr = today()
    const yearStart = `${new Date().getFullYear()}-01-01`

    const [txResult, habitsResult, completionsResult, sleepResult, workoutResult, yearWorkoutResult] =
      await Promise.all([
        supabase
          .from("social_media_transactions")
          .select("minutes")
          .eq("user_id", user.id)
          .eq("date", todayStr),
        supabase
          .from("habits")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .eq("frequency", "daily"),
        supabase
          .from("habit_completions")
          .select("habit_id")
          .eq("user_id", user.id)
          .eq("completed_date", todayStr),
        supabase
          .from("sleep_logs")
          .select("duration_minutes, date")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1),
        supabase
          .from("workouts")
          .select("split_day, date")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1),
        supabase
          .from("workouts")
          .select("id")
          .eq("user_id", user.id)
          .gte("date", yearStart),
      ])

    const balance = (txResult.data ?? []).reduce((s, t) => s + t.minutes, 0)

    // Calculate longest streak (simplified: just count from completions)
    const habitsData = habitsResult.data ?? []
    const completionsData = completionsResult.data ?? []

    setStats({
      socialBalance: Math.max(0, balance),
      habitsToday: {
        completed: completionsData.length,
        total: habitsData.length,
      },
      lastSleep: sleepResult.data?.[0]
        ? {
            duration: sleepResult.data[0].duration_minutes,
            date: sleepResult.data[0].date,
          }
        : null,
      lastWorkout: workoutResult.data?.[0]
        ? {
            split_day: workoutResult.data[0].split_day as SplitDay,
            date: workoutResult.data[0].date,
          }
        : null,
      longestStreak: null,
      workoutsThisYear: yearWorkoutResult.data?.length ?? 0,
    })
  }

  const quickLinks = [
    { href: "/gym", icon: Dumbbell, label: "Gym loggen", color: "text-orange-400" },
    { href: "/habits", icon: CheckSquare, label: "Habits", color: "text-green-400" },
    { href: "/sleep", icon: Moon, label: "Slaap", color: "text-blue-400" },
    { href: "/social-timer", icon: Clock, label: "Timer", color: "text-purple-400" },
    { href: "/motivatie", icon: Trophy, label: "Motivatie", color: "text-yellow-400" },
    { href: "/journal", icon: TrendingUp, label: "Journal", color: "text-pink-400" },
  ]

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{greeting} 👋</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Social media balance */}
        <Link href="/social-timer">
          <Card
            glow
            className="p-4 hover:border-orange-500/20 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-orange-400" />
              <span className="text-xs text-neutral-500">Social media</span>
            </div>
            <div className="text-xl font-bold text-white">
              {stats ? formatDuration(stats.socialBalance) : "—"}
            </div>
            <div className="text-[10px] text-neutral-600 mt-0.5">verdiend vandaag</div>
          </Card>
        </Link>

        {/* Habits */}
        <Link href="/habits">
          <Card className="p-4 hover:border-white/10 transition-all cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare size={14} className="text-green-400" />
              <span className="text-xs text-neutral-500">Habits</span>
            </div>
            <div className="text-xl font-bold text-white">
              {stats
                ? `${stats.habitsToday.completed}/${stats.habitsToday.total}`
                : "—"}
            </div>
            <div className="text-[10px] text-neutral-600 mt-0.5">vandaag voltooid</div>
          </Card>
        </Link>

        {/* Sleep */}
        <Link href="/sleep">
          <Card className="p-4 hover:border-white/10 transition-all cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <Moon size={14} className="text-blue-400" />
              <span className="text-xs text-neutral-500">Slaap</span>
            </div>
            <div className="text-xl font-bold text-white">
              {stats?.lastSleep
                ? formatDuration(stats.lastSleep.duration)
                : "—"}
            </div>
            <div
              className={`text-[10px] mt-0.5 ${
                stats?.lastSleep && stats.lastSleep.duration >= 420
                  ? "text-green-500"
                  : "text-neutral-600"
              }`}
            >
              {stats?.lastSleep && stats.lastSleep.duration >= 420
                ? "✓ Goede nacht"
                : "laatste nacht"}
            </div>
          </Card>
        </Link>

        {/* Workouts this year */}
        <Link href="/gym">
          <Card className="p-4 hover:border-white/10 transition-all cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={14} className="text-orange-400" />
              <span className="text-xs text-neutral-500">Workouts</span>
            </div>
            <div className="text-xl font-bold text-white">
              {stats?.workoutsThisYear ?? "—"}
            </div>
            <div className="text-[10px] text-neutral-600 mt-0.5">dit jaar</div>
          </Card>
        </Link>
      </div>

      {/* Last workout */}
      {stats?.lastWorkout && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Dumbbell size={16} className="text-orange-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  Laatste workout
                </div>
                <div className="text-xs text-neutral-500">
                  {SPLIT_LABELS[stats.lastWorkout.split_day]} •{" "}
                  {new Date(stats.lastWorkout.date).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
            </div>
            <Link href="/gym">
              <ArrowRight size={16} className="text-neutral-600" />
            </Link>
          </div>
        </Card>
      )}

      {/* Quick navigation */}
      <div>
        <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
          Modules
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {quickLinks.map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}>
              <Card className="p-3 hover:bg-white/[0.06] transition-all cursor-pointer text-center">
                <Icon size={20} className={`${color} mx-auto mb-1.5`} />
                <span className="text-[10px] text-neutral-400">{label}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
