"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { HabitForm } from "@/components/habits/HabitForm"
import type { Habit } from "@/types/database"
import { today } from "@/lib/utils"
import { Plus, CheckSquare, Pencil, Trash2, Flame } from "lucide-react"

interface HabitWithState extends Habit {
  completedToday: boolean
  streak: number
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithState[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadHabits()
  }, [])

  async function loadHabits() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const todayStr = today()

    const [habitsResult, completionsResult] = await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at"),
      supabase
        .from("habit_completions")
        .select("habit_id, completed_date")
        .eq("user_id", user.id)
        .gte("completed_date", getDateDaysAgo(90)),
    ])

    const completions = completionsResult.data ?? []
    const todayCompletions = new Set(
      completions
        .filter((c) => c.completed_date === todayStr)
        .map((c) => c.habit_id)
    )

    const habitsWithState: HabitWithState[] = (habitsResult.data ?? []).map(
      (h) => ({
        ...h,
        completedToday: todayCompletions.has(h.id),
        streak: calcStreak(
          completions
            .filter((c) => c.habit_id === h.id)
            .map((c) => c.completed_date)
        ),
      })
    )

    setHabits(habitsWithState)
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
      } else {
        break
      }
    }
    return streak
  }

  async function toggleHabit(habit: HabitWithState) {
    setToggling(habit.id)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const todayStr = today()

    if (habit.completedToday) {
      await supabase
        .from("habit_completions")
        .delete()
        .eq("habit_id", habit.id)
        .eq("completed_date", todayStr)
      await supabase
        .from("social_media_transactions")
        .delete()
        .eq("source", "habit")
        .eq("source_ref_id", habit.id)
        .eq("date", todayStr)
    } else {
      await supabase.from("habit_completions").insert({
        habit_id: habit.id,
        user_id: user.id,
        completed_date: todayStr,
      })
      if (habit.social_media_minutes > 0) {
        await supabase.from("social_media_transactions").insert({
          user_id: user.id,
          date: todayStr,
          source: "habit",
          source_ref_id: habit.id,
          minutes: habit.social_media_minutes,
          description: `Habit: ${habit.name}`,
        })
      }
    }

    setToggling(null)
    loadHabits()
  }

  async function deleteHabit(habitId: string) {
    if (!confirm("Habit verwijderen?")) return
    await supabase.from("habits").update({ is_active: false }).eq("id", habitId)
    loadHabits()
  }

  const completed = habits.filter((h) => h.completedToday).length

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare size={20} className="text-green-400" /> Habits
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5">
            {completed}/{habits.length} vandaag
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Habit
        </Button>
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="mb-5">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{
                width: `${habits.length > 0 ? (completed / habits.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center py-16 text-neutral-600">
          <CheckSquare size={32} className="mx-auto mb-3 opacity-30" />
          <p>Nog geen habits</p>
          <Button size="sm" onClick={() => setShowForm(true)} className="mt-4">
            Eerste habit toevoegen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => (
            <Card
              key={habit.id}
              className={`transition-all duration-150 ${
                habit.completedToday ? "border-green-500/15 bg-green-500/[0.03]" : ""
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3.5">
                <button
                  onClick={() => toggleHabit(habit)}
                  disabled={toggling === habit.id}
                  className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                    habit.completedToday
                      ? "bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                      : "border-white/20 hover:border-green-500/50"
                  }`}
                >
                  {habit.completedToday && (
                    <span className="text-white text-xs">✓</span>
                  )}
                </button>

                <span className="text-lg shrink-0">{habit.icon}</span>

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${
                      habit.completedToday
                        ? "text-neutral-400 line-through"
                        : "text-white"
                    }`}
                  >
                    {habit.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-neutral-600">
                      {habit.frequency === "daily" ? "Dagelijks" : "Wekelijks"}
                    </span>
                    {habit.social_media_minutes > 0 && (
                      <span className="text-[10px] text-orange-500/70">
                        +{habit.social_media_minutes}m
                      </span>
                    )}
                  </div>
                </div>

                {habit.streak > 0 && (
                  <div className="flex items-center gap-1 text-orange-400">
                    <Flame size={13} />
                    <span className="text-xs font-medium">{habit.streak}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 ml-1">
                  <button
                    onClick={() => {
                      setEditHabit(habit)
                    }}
                    className="p-1.5 rounded-lg text-neutral-600 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="p-1.5 rounded-lg text-neutral-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Habit toevoegen"
      >
        <HabitForm
          onSaved={() => {
            setShowForm(false)
            loadHabits()
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editHabit}
        onClose={() => setEditHabit(null)}
        title="Habit bewerken"
      >
        {editHabit && (
          <HabitForm
            habit={editHabit}
            onSaved={() => {
              setEditHabit(null)
              loadHabits()
            }}
            onCancel={() => setEditHabit(null)}
          />
        )}
      </Modal>
    </div>
  )
}
