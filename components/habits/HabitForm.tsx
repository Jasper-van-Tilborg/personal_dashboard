"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Habit } from "@/types/database"

const COMMON_ICONS = ["✅", "💪", "📚", "🏃", "🧘", "💊", "🥗", "💧", "🎯", "🌅", "🛌", "📝", "🎸", "🚴", "🧹"]

interface Props {
  habit?: Habit
  onSaved: () => void
  onCancel: () => void
}

export function HabitForm({ habit, onSaved, onCancel }: Props) {
  const [name, setName] = useState(habit?.name ?? "")
  const [icon, setIcon] = useState(habit?.icon ?? "✅")
  const [frequency, setFrequency] = useState<"daily" | "weekly">(habit?.frequency ?? "daily")
  const [minutes, setMinutes] = useState(habit?.social_media_minutes ?? 10)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const supabase = createClient()

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Naam is verplicht")
      return
    }
    setSaving(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    if (habit) {
      await supabase
        .from("habits")
        .update({ name: name.trim(), icon, frequency, social_media_minutes: minutes })
        .eq("id", habit.id)
    } else {
      await supabase.from("habits").insert({
        user_id: user.id,
        name: name.trim(),
        icon,
        frequency,
        social_media_minutes: minutes,
      })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="shrink-0">
          <label className="block text-xs text-neutral-400 mb-1.5">Icoon</label>
          <div className="flex flex-wrap gap-1.5 w-44">
            {COMMON_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                  icon === ic
                    ? "bg-orange-500/20 border border-orange-500/40"
                    : "bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Naam</label>
            <Input
              placeholder="Habit naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Frequentie</label>
            <div className="flex gap-2">
              {(["daily", "weekly"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`flex-1 py-2 rounded-xl text-sm transition-all ${
                    frequency === f
                      ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                      : "bg-white/[0.04] text-neutral-400 border border-white/[0.08]"
                  }`}
                >
                  {f === "daily" ? "Dagelijks" : "Wekelijks"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">
              Social media minuten
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="flex-1 accent-orange-500"
              />
              <span className="text-sm text-orange-400 font-medium w-12 text-right">
                {minutes}m
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Annuleren
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "Opslaan..." : habit ? "Opslaan" : "Toevoegen"}
        </Button>
      </div>
    </div>
  )
}
