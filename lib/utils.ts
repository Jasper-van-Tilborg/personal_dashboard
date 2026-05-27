import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}u`
  return `${h}u ${m}m`
}

export function today() {
  return new Date().toISOString().split("T")[0]
}

export function calcDurationMinutes(sleepTime: string, wakeTime: string): number {
  const [sh, sm] = sleepTime.split(":").map(Number)
  const [wh, wm] = wakeTime.split(":").map(Number)
  let sleepMins = sh * 60 + sm
  let wakeMins = wh * 60 + wm
  if (wakeMins <= sleepMins) wakeMins += 24 * 60
  return wakeMins - sleepMins
}
