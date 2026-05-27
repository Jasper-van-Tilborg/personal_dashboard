import { type SplitDay } from "@/types/database"

interface SeedExercise {
  name: string
  sets: { reps: number; weight: number }[]
}

interface SeedWorkout {
  split_day: SplitDay
  date: string
  exercises: SeedExercise[]
}

export const SEED_WORKOUTS: SeedWorkout[] = [
  {
    split_day: "bicep_tricep",
    date: "2026-05-19",
    exercises: [
      {
        name: "Hammer curl",
        sets: [
          { reps: 12, weight: 18 },
          { reps: 12, weight: 18 },
          { reps: 12, weight: 18 },
        ],
      },
      {
        name: "Been curl",
        sets: [
          { reps: 11.5, weight: 18 },
          { reps: 8.5, weight: 18 },
          { reps: 6.5, weight: 18 },
        ],
      },
      {
        name: "Cable curl",
        sets: [
          { reps: 12, weight: 20 },
          { reps: 12, weight: 20 },
          { reps: 8, weight: 20 },
        ],
      },
      {
        name: "Overhead extension",
        sets: [
          { reps: 9, weight: 46 },
          { reps: 12, weight: 41 },
          { reps: 12, weight: 41 },
        ],
      },
      {
        name: "Tricep pushdown",
        sets: [
          { reps: 10.5, weight: 50 },
          { reps: 9.5, weight: 50 },
          { reps: 9, weight: 50 },
        ],
      },
    ],
  },
  {
    split_day: "rug_borst",
    date: "2026-05-21",
    exercises: [
      {
        name: "Chest press",
        sets: [
          { reps: 11, weight: 35 },
          { reps: 10, weight: 35 },
          { reps: 8, weight: 35 },
        ],
      },
      {
        name: "Cable fly",
        sets: [
          { reps: 11, weight: 25 },
          { reps: 12, weight: 22.5 },
          { reps: 12, weight: 22.5 },
        ],
      },
      {
        name: "Pec fly",
        sets: [
          { reps: 9, weight: 50 },
          { reps: 9, weight: 50 },
          { reps: 9, weight: 50 },
        ],
      },
      {
        name: "Pulldown",
        sets: [
          { reps: 12, weight: 55 },
          { reps: 12, weight: 55 },
          { reps: 10, weight: 55 },
        ],
      },
      {
        name: "Row",
        sets: [
          { reps: 12, weight: 52.5 },
          { reps: 12, weight: 52.5 },
          { reps: 12, weight: 52.5 },
        ],
      },
      {
        name: "Bank",
        sets: [
          { reps: 10, weight: 20 },
          { reps: 10, weight: 20 },
          { reps: 12, weight: 20 },
        ],
      },
    ],
  },
  {
    split_day: "benen_onderarmen",
    date: "2026-05-23",
    exercises: [
      {
        name: "Leg press",
        // Set 1: 131.5kg, sets 2-3 noted as "300p" (≈300 lbs = 136kg)
        sets: [
          { reps: 12, weight: 131.5 },
          { reps: 12, weight: 136 },
          { reps: 12, weight: 136 },
        ],
      },
      {
        name: "Leg extension",
        sets: [
          { reps: 12, weight: 76.5 },
          { reps: 11, weight: 76.5 },
          { reps: 9, weight: 76.5 },
        ],
      },
      {
        name: "Leg curl",
        // Noted as "80p" (≈80 lbs = 36kg); knee injury — logged as reference
        sets: [
          { reps: 12, weight: 36 },
          { reps: 12, weight: 36 },
          { reps: 12, weight: 36 },
        ],
      },
      {
        name: "Forearms curl inside",
        sets: [
          { reps: 23, weight: 25 },
          { reps: 21, weight: 25 },
          { reps: 21, weight: 25 },
        ],
      },
      {
        name: "Forearms curl outside",
        // Set 2 reps were missing in notes — estimated as 15
        sets: [
          { reps: 19, weight: 25 },
          { reps: 15, weight: 25 },
          { reps: 10, weight: 25 },
        ],
      },
    ],
  },
  {
    split_day: "schouders_abs",
    date: "2026-05-26",
    exercises: [
      {
        name: "Ab curl",
        sets: [
          { reps: 8, weight: 30 },
          { reps: 8, weight: 30 },
          { reps: 12, weight: 25 },
        ],
      },
      {
        name: "Ab spin",
        sets: [
          { reps: 12, weight: 32.3 },
          { reps: 12, weight: 32.3 },
          { reps: 12, weight: 32.3 },
        ],
      },
      {
        name: "Shoulder press",
        sets: [
          { reps: 10, weight: 47.5 },
          { reps: 10, weight: 47.5 },
          { reps: 8, weight: 47.5 },
        ],
      },
      {
        name: "Shoulder fly",
        sets: [
          { reps: 12, weight: 25 },
          { reps: 12, weight: 25 },
          { reps: 12, weight: 25 },
        ],
      },
      {
        name: "Cable lateral raise",
        sets: [
          { reps: 12, weight: 10 },
          { reps: 12, weight: 10 },
          { reps: 8, weight: 10 },
        ],
      },
    ],
  },
]
