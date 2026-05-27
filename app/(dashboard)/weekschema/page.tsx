"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WeekScheduleDay, TimeBlock } from "@/types/database"
import { Calendar, Pencil, Plus, Trash2, Check, X } from "lucide-react"

const DAYS = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"]
const TODAY_DOW = new Date().getDay()

const BLOCK_COLORS = [
  "bg-orange-500/20 text-orange-300 border-orange-500/20",
  "bg-blue-500/20 text-blue-300 border-blue-500/20",
  "bg-green-500/20 text-green-300 border-green-500/20",
  "bg-purple-500/20 text-purple-300 border-purple-500/20",
  "bg-pink-500/20 text-pink-300 border-pink-500/20",
  "bg-yellow-500/20 text-yellow-300 border-yellow-500/20",
]

export default function WeekschemaPage() {
  const [schedule, setSchedule] = useState<Record<number, WeekScheduleDay>>({})
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editDay, setEditDay] = useState<number | null>(null)
  const [newBlock, setNewBlock] = useState<TimeBlock>({ time: "", activity: "", color: BLOCK_COLORS[0] })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadSchedule()
  }, [])

  async function loadSchedule() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("week_schedule")
      .select("*")
      .eq("user_id", user.id)

    const map: Record<number, WeekScheduleDay> = {}
    ;(data ?? []).forEach((d) => {
      map[d.day_of_week] = d
    })
    setSchedule(map)
    setLoading(false)
  }

  async function saveDay(dow: number, blocks: TimeBlock[]) {
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("week_schedule").upsert(
      {
        user_id: user.id,
        day_of_week: dow,
        time_blocks: blocks,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day_of_week" }
    )

    setSaving(false)
    loadSchedule()
  }

  function addBlock(dow: number) {
    if (!newBlock.time || !newBlock.activity) return
    const current = schedule[dow]?.time_blocks ?? []
    const sorted = [...current, { ...newBlock }].sort((a, b) =>
      a.time.localeCompare(b.time)
    )
    saveDay(dow, sorted)
    setNewBlock({ time: "", activity: "", color: BLOCK_COLORS[0] })
  }

  function removeBlock(dow: number, idx: number) {
    const current = [...(schedule[dow]?.time_blocks ?? [])]
    current.splice(idx, 1)
    saveDay(dow, current)
  }

  // Show Mon-Sun ordered (Monday first)
  const orderedDays = [1, 2, 3, 4, 5, 6, 0]

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar size={20} className="text-yellow-400" /> Weekschema
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5">Jouw standaard weekritme</p>
        </div>
        <Button
          variant={editMode ? "outline" : "ghost"}
          size="sm"
          onClick={() => {
            setEditMode(!editMode)
            setEditDay(null)
          }}
        >
          {editMode ? (
            <>
              <Check size={14} /> Klaar
            </>
          ) : (
            <>
              <Pencil size={14} /> Bewerken
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {orderedDays.map((dow) => {
            const day = schedule[dow]
            const blocks = day?.time_blocks ?? []
            const isToday = dow === TODAY_DOW
            const isEditing = editMode && editDay === dow

            return (
              <Card
                key={dow}
                className={`p-4 ${isToday ? "border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.06)]" : ""}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className={`text-sm font-semibold ${isToday ? "text-orange-400" : "text-white"}`}
                  >
                    {DAYS[dow]}
                    {isToday && (
                      <span className="ml-2 text-[10px] bg-orange-500/15 text-orange-400 px-1.5 py-0.5 rounded">
                        vandaag
                      </span>
                    )}
                  </h3>
                  {editMode && (
                    <button
                      onClick={() => setEditDay(isEditing ? null : dow)}
                      className="text-neutral-600 hover:text-orange-400 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>

                {blocks.length === 0 && (
                  <p className="text-neutral-700 text-xs">Vrij</p>
                )}

                <div className="space-y-1.5">
                  {blocks.map((block, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border text-xs ${block.color ?? BLOCK_COLORS[0]}`}
                    >
                      <span className="font-mono opacity-70 shrink-0">
                        {block.time}
                      </span>
                      <span className="flex-1 truncate">{block.activity}</span>
                      {editMode && (
                        <button
                          onClick={() => removeBlock(dow, i)}
                          className="opacity-50 hover:opacity-100"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                    <Input
                      type="time"
                      value={newBlock.time}
                      onChange={(e) =>
                        setNewBlock((b) => ({ ...b, time: e.target.value }))
                      }
                      className="text-xs py-1.5"
                    />
                    <Input
                      placeholder="Activiteit"
                      value={newBlock.activity}
                      onChange={(e) =>
                        setNewBlock((b) => ({ ...b, activity: e.target.value }))
                      }
                      className="text-xs py-1.5"
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {BLOCK_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() =>
                            setNewBlock((b) => ({ ...b, color: c }))
                          }
                          className={`w-5 h-5 rounded-full border-2 ${c} ${
                            newBlock.color === c
                              ? "scale-125 border-white"
                              : "border-transparent"
                          } transition-transform`}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addBlock(dow)}
                      disabled={saving || !newBlock.time || !newBlock.activity}
                      className="w-full"
                    >
                      <Plus size={12} /> Toevoegen
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
