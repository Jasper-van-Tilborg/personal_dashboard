"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import type { MotivationGoal } from "@/types/database"
import { today } from "@/lib/utils"
import { Trophy, Flame, Dumbbell, Target, Plus, Trash2, Check } from "lucide-react"

export default function MotivatiePage() {
  const [goals, setGoals] = useState<MotivationGoal[]>([])
  const [stats, setStats] = useState({
    workoutsYear: 0,
    longestStreak: 0,
    longestStreakHabit: "",
    currentStreak: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalTitle, setGoalTitle] = useState("")
  const [goalDate, setGoalDate] = useState("")
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const yearStart = `${new Date().getFullYear()}-01-01`
    const todayStr = today()

    const [goalsResult, workoutsResult, habitsResult, completionsResult] =
      await Promise.all([
        supabase
          .from("motivation_goals")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("target_date", { ascending: true, nullsFirst: false }),
        supabase
          .from("workouts")
          .select("id")
          .eq("user_id", user.id)
          .gte("date", yearStart),
        supabase
          .from("habits")
          .select("id, name")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("habit_completions")
          .select("habit_id, completed_date")
          .eq("user_id", user.id)
          .gte("completed_date", getDateDaysAgo(180)),
      ])

    setGoals(goalsResult.data ?? [])

    // Calculate streaks per habit
    const habits = habitsResult.data ?? []
    const completions = completionsResult.data ?? []

    let maxStreak = 0
    let maxHabit = ""

    for (const habit of habits) {
      const dates = completions
        .filter((c) => c.habit_id === habit.id)
        .map((c) => c.completed_date)
      const streak = calcStreak(dates)
      if (streak > maxStreak) {
        maxStreak = streak
        maxHabit = habit.name
      }
    }

    setStats({
      workoutsYear: workoutsResult.data?.length ?? 0,
      longestStreak: maxStreak,
      longestStreakHabit: maxHabit,
      currentStreak: maxStreak,
    })

    setLoading(false)
  }

  function getDateDaysAgo(days: number) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split("T")[0]
  }

  function calcStreak(dates: string[]): number {
    if (dates.length === 0) return 0
    const sorted = [...dates].sort().reverse()
    const todayStr = today()
    let streak = 0
    let current = todayStr

    for (const date of sorted) {
      if (date === current) {
        streak++
        const d = new Date(current)
        d.setDate(d.getDate() - 1)
        current = d.toISOString().split("T")[0]
      } else break
    }
    return streak
  }

  function getDaysUntil(dateStr: string) {
    const target = new Date(dateStr)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  async function addGoal() {
    if (!goalTitle.trim()) return
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("motivation_goals").insert({
      user_id: user.id,
      title: goalTitle.trim(),
      target_date: goalDate || null,
    })

    setGoalTitle("")
    setGoalDate("")
    setSaving(false)
    setShowGoalForm(false)
    loadData()
  }

  async function deleteGoal(id: string) {
    await supabase.from("motivation_goals").update({ is_active: false }).eq("id", id)
    loadData()
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy size={20} className="text-yellow-400" /> Motivatie
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5">Stats & doelen</p>
        </div>
        <Button size="sm" onClick={() => setShowGoalForm(true)}>
          <Plus size={14} /> Doel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card glow className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell size={16} className="text-orange-400" />
            <span className="text-xs text-neutral-500">Workouts dit jaar</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {loading ? "—" : stats.workoutsYear}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={16} className="text-orange-400" />
            <span className="text-xs text-neutral-500">Langste streak</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {loading ? "—" : stats.longestStreak}
          </div>
          {stats.longestStreakHabit && (
            <div className="text-xs text-neutral-600 mt-1 truncate">
              {stats.longestStreakHabit}
            </div>
          )}
        </Card>
      </div>

      {/* Goals */}
      <div>
        <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
          Doelen
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-10 text-neutral-600">
            <Target size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nog geen doelen ingesteld</p>
          </div>
        ) : (
          <div className="space-y-2">
            {goals.map((goal) => {
              const daysLeft = goal.target_date ? getDaysUntil(goal.target_date) : null
              const isPast = daysLeft !== null && daysLeft < 0

              return (
                <Card
                  key={goal.id}
                  className={`p-4 ${isPast ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isPast
                          ? "bg-neutral-500/10"
                          : daysLeft !== null && daysLeft <= 7
                          ? "bg-red-500/10"
                          : "bg-orange-500/10"
                      }`}
                    >
                      {isPast ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Target
                          size={14}
                          className={
                            daysLeft !== null && daysLeft <= 7
                              ? "text-red-400"
                              : "text-orange-400"
                          }
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {goal.title}
                      </div>
                      {goal.target_date && (
                        <div
                          className={`text-xs mt-0.5 ${
                            isPast
                              ? "text-green-500"
                              : daysLeft !== null && daysLeft <= 7
                              ? "text-red-400"
                              : "text-neutral-500"
                          }`}
                        >
                          {isPast
                            ? "Voorbij"
                            : daysLeft === 0
                            ? "Vandaag!"
                            : `${daysLeft} dag${daysLeft !== 1 ? "en" : ""}`}
                          {" • "}
                          {new Date(goal.target_date).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="p-1.5 rounded-lg text-neutral-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Countdown progress bar */}
                  {goal.target_date && daysLeft !== null && daysLeft > 0 && (
                    <div className="mt-3 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          daysLeft <= 7 ? "bg-red-500" : "bg-orange-500"
                        }`}
                        style={{
                          width: `${Math.max(2, 100 - (daysLeft / 365) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showGoalForm}
        onClose={() => setShowGoalForm(false)}
        title="Doel toevoegen"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Doel</label>
            <Input
              placeholder="Bijv. Portfolio review"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">
              Datum (optioneel)
            </label>
            <Input
              type="date"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowGoalForm(false)}
              className="flex-1"
            >
              Annuleren
            </Button>
            <Button
              onClick={addGoal}
              disabled={saving || !goalTitle.trim()}
              className="flex-1"
            >
              Toevoegen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
