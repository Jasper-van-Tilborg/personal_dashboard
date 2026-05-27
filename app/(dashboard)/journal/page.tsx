"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import type { JournalEntry } from "@/types/database"
import { today, formatDate } from "@/lib/utils"
import { BookOpen, Check, ChevronDown, ChevronUp } from "lucide-react"

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(today())
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(50)

    setEntries(data ?? [])

    const todayEntry = (data ?? []).find((e) => e.date === today())
    if (todayEntry) setContent(todayEntry.content)

    setLoading(false)
  }

  async function saveEntry() {
    if (!content.trim()) return
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("journal_entries").upsert(
      {
        user_id: user.id,
        date,
        content: content.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    )

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
    loadEntries()
  }

  function preview(text: string, maxLen = 120) {
    return text.length > maxLen ? text.slice(0, maxLen) + "..." : text
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen size={20} className="text-pink-400" /> Journal
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5">Vrije dagelijkse notities</p>
      </div>

      {/* Editor */}
      <Card className="mb-6 p-5">
        <div className="mb-3">
          <label className="block text-xs text-neutral-400 mb-1.5">Datum</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              const existing = entries.find((en) => en.date === e.target.value)
              setContent(existing?.content ?? "")
            }}
            className="w-40"
          />
        </div>
        <Textarea
          placeholder="Hoe was je dag? Wat is er in je hoofd?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="mb-3"
        />
        <Button
          onClick={saveEntry}
          disabled={saving || !content.trim()}
          className="w-full"
        >
          {saved ? (
            <>
              <Check size={14} /> Opgeslagen
            </>
          ) : saving ? (
            "Opslaan..."
          ) : (
            "Opslaan"
          )}
        </Button>
      </Card>

      {/* History */}
      {!loading && entries.filter((e) => e.date !== date).length > 0 && (
        <div>
          <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
            Eerdere entries
          </h2>
          <div className="space-y-2">
            {entries
              .filter((e) => e.date !== date)
              .map((entry) => (
                <Card key={entry.id}>
                  <button
                    className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3"
                    onClick={() =>
                      setExpandedId(
                        expandedId === entry.id ? null : entry.id
                      )
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-neutral-500 mb-1">
                        {formatDate(entry.date)}
                      </div>
                      <p className="text-sm text-neutral-300 text-left line-clamp-2">
                        {expandedId === entry.id
                          ? entry.content
                          : preview(entry.content)}
                      </p>
                    </div>
                    <div className="shrink-0 text-neutral-600 mt-1">
                      {expandedId === entry.id ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </div>
                  </button>
                  {expandedId === entry.id && (
                    <div className="border-t border-white/[0.06] px-4 py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDate(entry.date)
                          setContent(entry.content)
                          window.scrollTo({ top: 0, behavior: "smooth" })
                        }}
                      >
                        Bewerken
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
