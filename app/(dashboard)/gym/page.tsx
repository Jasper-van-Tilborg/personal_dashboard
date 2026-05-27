"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { WorkoutForm } from "@/components/gym/WorkoutForm"
import { ProgressChart } from "@/components/gym/ProgressChart"
import { type Workout, type WorkoutExercise, SPLIT_LABELS } from "@/types/database"
import { SEED_WORKOUTS } from "@/lib/gym-seed"
import { formatDate } from "@/lib/utils"
import { Plus, Dumbbell, ChevronDown, ChevronUp, TrendingUp, Download, Pencil, Trash2 } from "lucide-react"

interface EditingWorkout {
  id: string
  date: string
  split_day: string
  notes: string | null
  exercises: WorkoutExercise[]
}

export default function GymPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState<EditingWorkout | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Record<string, WorkoutExercise[]>>({})
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [chartExercise, setChartExercise] = useState("")
  const [allExerciseNames, setAllExerciseNames] = useState<string[]>([])
  const [chartData, setChartData] = useState<{ date: string; weight: number }[]>([])
  const [showChart, setShowChart] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadWorkouts()
  }, [])

  async function loadWorkouts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30)

    setWorkouts(data ?? [])

    const { data: exData } = await supabase
      .from("workout_exercises")
      .select("exercise_name, workouts!inner(user_id)")
      .eq("workouts.user_id", user.id)

    const names = [...new Set((exData ?? []).map((e: any) => e.exercise_name))].sort()
    setAllExerciseNames(names)

    setLoading(false)
  }

  async function loadExercises(workoutId: string) {
    if (exercises[workoutId]) return exercises[workoutId]
    const { data } = await supabase
      .from("workout_exercises")
      .select("*")
      .eq("workout_id", workoutId)
      .order("order_index")

    const result = data ?? []
    setExercises((prev) => ({ ...prev, [workoutId]: result }))
    return result
  }

  async function toggleExpand(workoutId: string) {
    if (expandedId === workoutId) {
      setExpandedId(null)
    } else {
      setExpandedId(workoutId)
      await loadExercises(workoutId)
    }
  }

  async function handleEdit(w: Workout, e: React.MouseEvent) {
    e.stopPropagation()
    const exList = exercises[w.id] ?? await loadExercises(w.id)
    setEditingWorkout({
      id: w.id,
      date: w.date,
      split_day: w.split_day,
      notes: w.notes,
      exercises: exList,
    })
  }

  async function handleDelete(workoutId: string) {
    setDeleting(true)
    await supabase.from("workouts").delete().eq("id", workoutId)
    await supabase.from("social_media_transactions").delete().eq("source_ref_id", workoutId)
    setExercises((prev) => {
      const next = { ...prev }
      delete next[workoutId]
      return next
    })
    if (expandedId === workoutId) setExpandedId(null)
    setDeleteConfirmId(null)
    setDeleting(false)
    loadWorkouts()
  }

  async function loadChartData(exerciseName: string) {
    const { data: { user } } = await supabase.auth.getUser()
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

  async function seedInitialWorkouts() {
    setSeeding(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSeeding(false); return }

    for (const w of SEED_WORKOUTS) {
      const { data: workout } = await supabase
        .from("workouts")
        .insert({
          user_id: user.id,
          date: w.date,
          split_day: w.split_day,
          notes: null,
          social_media_minutes_earned: 45,
        })
        .select()
        .single()

      if (!workout) continue

      await supabase.from("workout_exercises").insert(
        w.exercises.map((e, i) => ({
          workout_id: workout.id,
          exercise_name: e.name,
          sets: e.sets,
          order_index: i,
        }))
      )
    }

    setSeeding(false)
    loadWorkouts()
  }

  function handleSaved() {
    setShowForm(false)
    setEditingWorkout(null)
    // Invalidate cached exercises so they reload fresh
    setExercises({})
    loadWorkouts()
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
          <Button variant="ghost" size="sm" onClick={() => setShowChart(!showChart)}>
            <TrendingUp size={14} /> Progressie
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
              <option value="" className="bg-[#1a1a1a]">Kies oefening...</option>
              {allExerciseNames.map((n) => (
                <option key={n} value={n} className="bg-[#1a1a1a]">{n}</option>
              ))}
            </select>
          </div>
          {chartExercise && <ProgressChart data={chartData} />}
        </Card>
      )}

      {/* Workouts list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-16 text-neutral-600">
          <Dumbbell size={32} className="mx-auto mb-3 opacity-30" />
          <p className="mb-1">Nog geen workouts gelogd</p>
          <p className="text-xs text-neutral-700 mb-4">Laad je startpunt in of log een nieuwe workout</p>
          <div className="flex flex-col items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={seedInitialWorkouts}
              disabled={seeding}
              className="text-orange-400 hover:text-orange-300 border border-orange-500/20"
            >
              <Download size={13} />
              {seeding ? "Inladen..." : "Startpunt inladen (afgelopen week)"}
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={13} /> Nieuwe workout loggen
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <Card key={w.id}>
              {/* Card header — click to expand */}
              <button
                className="w-full text-left px-4 py-3.5 flex items-center justify-between"
                onClick={() => toggleExpand(w.id)}
              >
                <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${splitColors[w.split_day] ?? "text-neutral-400 bg-white/5"}`}>
                  {SPLIT_LABELS[w.split_day as keyof typeof SPLIT_LABELS]}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">{formatDate(w.date)}</span>
                  {/* Edit button */}
                  <span
                    role="button"
                    onClick={(e) => handleEdit(w, e)}
                    className="p-1 text-neutral-600 hover:text-blue-400 transition-colors"
                    title="Bewerken"
                  >
                    <Pencil size={13} />
                  </span>
                  {/* Delete button / confirm */}
                  {deleteConfirmId === w.id ? (
                    <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] text-neutral-500">Verwijderen?</span>
                      <span
                        role="button"
                        onClick={() => handleDelete(w.id)}
                        className="text-[11px] text-red-400 hover:text-red-300 font-medium px-1 transition-colors"
                      >
                        {deleting ? "..." : "Ja"}
                      </span>
                      <span
                        role="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-[11px] text-neutral-500 hover:text-neutral-300 px-1 transition-colors"
                      >
                        Nee
                      </span>
                    </span>
                  ) : (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(w.id) }}
                      className="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 size={13} />
                    </span>
                  )}
                  {expandedId === w.id
                    ? <ChevronUp size={14} className="text-neutral-600" />
                    : <ChevronDown size={14} className="text-neutral-600" />
                  }
                </div>
              </button>

              {/* Expanded exercises */}
              {expandedId === w.id && (
                <div className="border-t border-white/[0.06] px-4 py-3">
                  {exercises[w.id] ? (
                    <div className="space-y-2">
                      {exercises[w.id].map((ex) => (
                        <div key={ex.id}>
                          <div className="text-sm font-medium text-white mb-1">{ex.exercise_name}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {ex.sets.map((set, i) => (
                              <span
                                key={i}
                                className="text-xs bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-neutral-300"
                              >
                                {set.weight}kg × {set.reps}
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

      {/* New workout modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Workout loggen">
        <WorkoutForm onSaved={handleSaved} onCancel={() => setShowForm(false)} />
      </Modal>

      {/* Edit workout modal */}
      <Modal
        isOpen={!!editingWorkout}
        onClose={() => setEditingWorkout(null)}
        title="Workout bewerken"
      >
        {editingWorkout && (
          <WorkoutForm
            editWorkout={{
              id: editingWorkout.id,
              date: editingWorkout.date,
              split_day: editingWorkout.split_day as any,
              notes: editingWorkout.notes,
              exercises: editingWorkout.exercises,
            }}
            onSaved={handleSaved}
            onCancel={() => setEditingWorkout(null)}
          />
        )}
      </Modal>
    </div>
  )
}
