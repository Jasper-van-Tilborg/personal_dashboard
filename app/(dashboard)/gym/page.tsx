"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { WorkoutForm } from "@/components/gym/WorkoutForm"
import { ProgressChart } from "@/components/gym/ProgressChart"
import { type Workout, type WorkoutExercise, SPLIT_LABELS } from "@/types/database"
import { formatDate } from "@/lib/utils"
import { Plus, Dumbbell, ChevronDown, ChevronUp, TrendingUp } from "lucide-react"

export default function GymPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Record<string, WorkoutExercise[]>>({})
  const [chartExercise, setChartExercise] = useState("")
  const [allExerciseNames, setAllExerciseNames] = useState<string[]>([])
  const [chartData, setChartData] = useState<{ date: string; weight: number }[]>([])
  const [showChart, setShowChart] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadWorkouts()
  }, [])

  async function loadWorkouts() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30)

    setWorkouts(data ?? [])

    // Get all unique exercise names
    const { data: exData } = await supabase
      .from("workout_exercises")
      .select("exercise_name, workouts!inner(user_id)")
      .eq("workouts.user_id", user.id)

    const names = [...new Set((exData ?? []).map((e: any) => e.exercise_name))].sort()
    setAllExerciseNames(names)

    setLoading(false)
  }

  async function loadExercises(workoutId: string) {
    if (exercises[workoutId]) return
    const { data } = await supabase
      .from("workout_exercises")
      .select("*")
      .eq("workout_id", workoutId)
      .order("order_index")

    setExercises((prev) => ({ ...prev, [workoutId]: data ?? [] }))
  }

  async function toggleExpand(workoutId: string) {
    if (expandedId === workoutId) {
      setExpandedId(null)
    } else {
      setExpandedId(workoutId)
      await loadExercises(workoutId)
    }
  }

  async function loadChartData(exerciseName: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("workout_exercises")
      .select("sets, workout_id, workouts!inner(date, user_id)")
      .eq("exercise_name", exerciseName)
      .eq("workouts.user_id", user.id)
      .order("workout_id")

    if (!data) return

    const points = data
      .map((e: any) => {
        const sets = e.sets as { reps: number; weight: number }[]
        const maxWeight = Math.max(...sets.map((s) => s.weight))
        const date = new Date(e.workouts.date).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "short",
        })
        return { date, weight: maxWeight }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    setChartData(points)
  }

  const splitColors: Record<string, string> = {
    bicep_tricep: "text-orange-400 bg-orange-500/10",
    rug_borst: "text-blue-400 bg-blue-500/10",
    benen_onderarmen: "text-green-400 bg-green-500/10",
    schouders_abs: "text-purple-400 bg-purple-500/10",
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Dumbbell size={20} className="text-orange-400" /> Gym Tracker
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5">4-daagse split</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChart(!showChart)}
          >
            <TrendingUp size={14} />
            Progressie
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Loggen
          </Button>
        </div>
      </div>

      {/* Progress chart panel */}
      {showChart && (
        <Card className="mb-5 p-4">
          <div className="flex items-center gap-3 mb-4">
            <select
              value={chartExercise}
              onChange={(e) => {
                setChartExercise(e.target.value)
                if (e.target.value) loadChartData(e.target.value)
              }}
              className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="" className="bg-[#1a1a1a]">
                Kies oefening...
              </option>
              {allExerciseNames.map((n) => (
                <option key={n} value={n} className="bg-[#1a1a1a]">
                  {n}
                </option>
              ))}
            </select>
          </div>
          {chartExercise && (
            <ProgressChart data={chartData} />
          )}
        </Card>
      )}

      {/* Workouts list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-white/[0.03] animate-pulse"
            />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-16 text-neutral-600">
          <Dumbbell size={32} className="mx-auto mb-3 opacity-30" />
          <p>Nog geen workouts gelogd</p>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="mt-4"
          >
            Eerste workout loggen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <Card key={w.id}>
              <button
                className="w-full text-left px-4 py-3.5 flex items-center justify-between"
                onClick={() => toggleExpand(w.id)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                      splitColors[w.split_day] ?? "text-neutral-400 bg-white/5"
                    }`}
                  >
                    {SPLIT_LABELS[w.split_day as keyof typeof SPLIT_LABELS]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-500">
                    {formatDate(w.date)}
                  </span>
                  {expandedId === w.id ? (
                    <ChevronUp size={14} className="text-neutral-600" />
                  ) : (
                    <ChevronDown size={14} className="text-neutral-600" />
                  )}
                </div>
              </button>

              {expandedId === w.id && (
                <div className="border-t border-white/[0.06] px-4 py-3">
                  {exercises[w.id] ? (
                    <div className="space-y-2">
                      {exercises[w.id].map((ex) => (
                        <div key={ex.id}>
                          <div className="text-sm font-medium text-white mb-1">
                            {ex.exercise_name}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ex.sets.map((set, i) => (
                              <span
                                key={i}
                                className="text-xs bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-neutral-300"
                              >
                                {set.reps} × {set.weight}kg
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {w.notes && (
                        <p className="text-xs text-neutral-500 mt-2 pt-2 border-t border-white/[0.06]">
                          {w.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-600">Laden...</div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Workout loggen"
      >
        <WorkoutForm
          onSaved={() => {
            setShowForm(false)
            loadWorkouts()
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  )
}
