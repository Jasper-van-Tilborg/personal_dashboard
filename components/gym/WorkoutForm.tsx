"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { SPLIT_LABELS, SPLIT_EXERCISES, type SplitDay, type ExerciseSet, type WorkoutExercise } from "@/types/database"
import { today } from "@/lib/utils"
import { Plus, Trash2, X, RotateCcw } from "lucide-react"

interface ExerciseDraft {
  name: string
  sets: ExerciseSet[]
}

interface EditWorkout {
  id: string
  date: string
  split_day: SplitDay
  notes: string | null
  exercises: WorkoutExercise[]
}

interface Props {
  onSaved: () => void
  onCancel: () => void
  editWorkout?: EditWorkout
}

export function WorkoutForm({ onSaved, onCancel, editWorkout }: Props) {
  const [date, setDate] = useState(editWorkout?.date ?? today())
  const [splitDay, setSplitDay] = useState<SplitDay>(editWorkout?.split_day ?? "bicep_tricep")
  const [notes, setNotes] = useState(editWorkout?.notes ?? "")
  const [exercises, setExercises] = useState<ExerciseDraft[]>(
    editWorkout
      ? editWorkout.exercises.map((e) => ({
          name: e.exercise_name,
          sets: e.sets.map((s) => ({ reps: s.reps, weight: s.weight })),
        }))
      : []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loadingTemplate, setLoadingTemplate] = useState(!editWorkout)
  const [lastWorkoutDate, setLastWorkoutDate] = useState<string | null>(null)

  const supabase = createClient()

  const loadTemplate = useCallback(async (split: SplitDay) => {
    setLoadingTemplate(true)
    setLastWorkoutDate(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoadingTemplate(false)
      return
    }

    const { data: lastWorkout } = await supabase
      .from("workouts")
      .select("id, date")
      .eq("user_id", user.id)
      .eq("split_day", split)
      .order("date", { ascending: false })
      .limit(1)
      .single()

    if (lastWorkout) {
      const { data: lastExercises } = await supabase
        .from("workout_exercises")
        .select("exercise_name, sets")
        .eq("workout_id", lastWorkout.id)
        .order("order_index")

      if (lastExercises && lastExercises.length > 0) {
        setExercises(lastExercises.map((e) => ({
          name: e.exercise_name,
          sets: (e.sets as ExerciseSet[]).map((s) => ({ reps: s.reps, weight: s.weight })),
        })))
        setLastWorkoutDate(lastWorkout.date)
        setLoadingTemplate(false)
        return
      }
    }

    setExercises(
      SPLIT_EXERCISES[split].map((name) => ({
        name,
        sets: [{ reps: 0, weight: 0 }, { reps: 0, weight: 0 }, { reps: 0, weight: 0 }],
      }))
    )
    setLoadingTemplate(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editWorkout) {
      loadTemplate(splitDay)
    }
  }, [splitDay]) // eslint-disable-line react-hooks/exhaustive-deps

  const addExercise = () =>
    setExercises((ex) => [...ex, { name: "", sets: [{ reps: 0, weight: 0 }] }])

  const removeExercise = (i: number) =>
    setExercises((ex) => ex.filter((_, idx) => idx !== i))

  const addSet = (i: number) =>
    setExercises((ex) =>
      ex.map((e, idx) =>
        idx === i ? { ...e, sets: [...e.sets, { reps: 0, weight: 0 }] } : e
      )
    )

  const removeSet = (ei: number, si: number) =>
    setExercises((ex) =>
      ex.map((e, idx) =>
        idx === ei ? { ...e, sets: e.sets.filter((_, s) => s !== si) } : e
      )
    )

  const updateExerciseName = (i: number, name: string) =>
    setExercises((ex) => ex.map((e, idx) => (idx === i ? { ...e, name } : e)))

  const updateSet = (ei: number, si: number, field: keyof ExerciseSet, val: number) =>
    setExercises((ex) =>
      ex.map((e, idx) =>
        idx === ei
          ? { ...e, sets: e.sets.map((s, sidx) => (sidx === si ? { ...s, [field]: val } : s)) }
          : e
      )
    )

  const handleSave = async () => {
    if (!exercises.some((e) => e.name.trim())) {
      setError("Voeg minimaal één oefening toe")
      return
    }
    setSaving(true)
    setError("")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const validExercises = exercises.filter((e) => e.name.trim())

    if (editWorkout) {
      // Update existing workout
      const { error: wErr } = await supabase
        .from("workouts")
        .update({ date, split_day: splitDay, notes: notes || null })
        .eq("id", editWorkout.id)

      if (wErr) {
        setError("Opslaan mislukt")
        setSaving(false)
        return
      }

      await supabase.from("workout_exercises").delete().eq("workout_id", editWorkout.id)
      await supabase.from("workout_exercises").insert(
        validExercises.map((e, i) => ({
          workout_id: editWorkout.id,
          exercise_name: e.name.trim(),
          sets: e.sets,
          order_index: i,
        }))
      )
    } else {
      // Insert new workout
      const { data: workout, error: wErr } = await supabase
        .from("workouts")
        .insert({
          user_id: user.id,
          date,
          split_day: splitDay,
          notes: notes || null,
          social_media_minutes_earned: 45,
        })
        .select()
        .single()

      if (wErr || !workout) {
        setError("Opslaan mislukt")
        setSaving(false)
        return
      }

      await supabase.from("workout_exercises").insert(
        validExercises.map((e, i) => ({
          workout_id: workout.id,
          exercise_name: e.name.trim(),
          sets: e.sets,
          order_index: i,
        }))
      )

      await supabase.from("social_media_transactions").insert({
        user_id: user.id,
        date,
        source: "workout",
        source_ref_id: workout.id,
        minutes: 45,
        description: `Workout: ${SPLIT_LABELS[splitDay]}`,
      })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Datum</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Split dag</label>
          <select
            value={splitDay}
            onChange={(e) => setSplitDay(e.target.value as SplitDay)}
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          >
            {Object.entries(SPLIT_LABELS).map(([val, label]) => (
              <option key={val} value={val} className="bg-[#1a1a1a]">
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-400">Oefeningen</label>
            {lastWorkoutDate && (
              <span className="text-[10px] text-neutral-600">
                ingeladen van {new Date(lastWorkoutDate).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!editWorkout && (
              <button
                onClick={() => loadTemplate(splitDay)}
                className="text-[11px] text-neutral-600 hover:text-neutral-400 flex items-center gap-1 transition-colors"
                title="Opnieuw laden"
              >
                <RotateCcw size={11} />
              </button>
            )}
            <button
              onClick={addExercise}
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
            >
              <Plus size={12} /> Oefening
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {loadingTemplate && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          )}
          {!loadingTemplate && exercises.map((ex, ei) => (
            <div
              key={ei}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Oefening naam"
                  value={ex.name}
                  onChange={(e) => updateExerciseName(ei, e.target.value)}
                  className="flex-1"
                />
                {exercises.length > 1 && (
                  <button
                    onClick={() => removeExercise(ei)}
                    className="text-neutral-600 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {ex.sets.map((set, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-600 w-8 shrink-0">
                      Set {si + 1}
                    </span>
                    <Input
                      type="number"
                      placeholder="kg"
                      value={set.weight || ""}
                      onChange={(e) => updateSet(ei, si, "weight", Number(e.target.value))}
                      className="flex-1 text-center"
                      min={0}
                      step={0.5}
                    />
                    <span className="text-[10px] text-neutral-600">kg ×</span>
                    <Input
                      type="number"
                      placeholder="Reps"
                      value={set.reps || ""}
                      onChange={(e) => updateSet(ei, si, "reps", Number(e.target.value))}
                      className="flex-1 text-center"
                      min={0}
                    />
                    {ex.sets.length > 1 && (
                      <button
                        onClick={() => removeSet(ei, si)}
                        className="text-neutral-700 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addSet(ei)}
                  className="text-[11px] text-neutral-600 hover:text-orange-400 transition-colors flex items-center gap-1 pl-10"
                >
                  <Plus size={10} /> set
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-400 mb-1.5">
          Notities (optioneel)
        </label>
        <Textarea
          placeholder="Hoe ging de training?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Annuleren
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "Opslaan..." : editWorkout ? "Opslaan" : "Opslaan +45 min"}
        </Button>
      </div>
    </div>
  )
}
