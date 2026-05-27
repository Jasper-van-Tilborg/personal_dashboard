export type SplitDay =
  | "bicep_tricep"
  | "rug_borst"
  | "benen_onderarmen"
  | "schouders_abs"

export const SPLIT_LABELS: Record<SplitDay, string> = {
  bicep_tricep: "Bicep / Tricep",
  rug_borst: "Rug / Borst",
  benen_onderarmen: "Benen / Onderarmen",
  schouders_abs: "Schouders / Abs",
}

export const SPLIT_EXERCISES: Record<SplitDay, string[]> = {
  bicep_tricep: [
    "Hammer curl",
    "Been curl",
    "Cable curl",
    "Overhead extension",
    "Tricep pushdown",
  ],
  rug_borst: [
    "Chest press",
    "Cable fly",
    "Pec fly",
    "Pulldown",
    "Row",
    "Bank",
  ],
  benen_onderarmen: [
    "Leg press",
    "Leg extension",
    "Leg curl",
    "Forearms curl inside",
    "Forearms curl outside",
  ],
  schouders_abs: [
    "Ab curl",
    "Ab spin",
    "Shoulder press",
    "Shoulder fly",
    "Cable lateral raise",
  ],
}

export interface ExerciseSet {
  reps: number
  weight: number
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_name: string
  sets: ExerciseSet[]
  order_index: number
}

export interface Workout {
  id: string
  user_id: string
  date: string
  split_day: SplitDay
  notes: string | null
  social_media_minutes_earned: number
  created_at: string
  workout_exercises?: WorkoutExercise[]
}

export interface Habit {
  id: string
  user_id: string
  name: string
  icon: string
  frequency: "daily" | "weekly"
  social_media_minutes: number
  is_active: boolean
  created_at: string
}

export interface HabitCompletion {
  id: string
  habit_id: string
  user_id: string
  completed_date: string
  created_at: string
}

export interface SleepLog {
  id: string
  user_id: string
  date: string
  sleep_time: string
  wake_time: string
  duration_minutes: number
  notes: string | null
  created_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  date: string
  weight_kg: number
  created_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  date: string
  content: string
  created_at: string
  updated_at: string
}

export interface TimeBlock {
  time: string
  activity: string
  color?: string
}

export interface WeekScheduleDay {
  id: string
  user_id: string
  day_of_week: number
  time_blocks: TimeBlock[]
  updated_at: string
}

export type TransactionSource = "workout" | "habit" | "sleep" | "timer_used"

export interface SocialMediaTransaction {
  id: string
  user_id: string
  date: string
  source: TransactionSource
  source_ref_id: string | null
  minutes: number
  description: string | null
  created_at: string
}

export interface MotivationGoal {
  id: string
  user_id: string
  title: string
  target_date: string | null
  is_active: boolean
  created_at: string
}

export interface SpotifyToken {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  updated_at: string
}
