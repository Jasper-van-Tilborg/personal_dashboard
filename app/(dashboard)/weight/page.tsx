"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WeightLog } from "@/types/database"
import { today, formatDate } from "@/lib/utils"
import { Scale, Plus, TrendingUp, TrendingDown, Minus, Pencil, X } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

export default function WeightPage() {
  const [logs, setLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [statsFilter, setStatsFilter] = useState<"met" | "zonder">("zonder")
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState("")
  const [withClothes, setWithClothes] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(60)

    const loaded = data ?? []
    setLogs(loaded)

    const todayEntry = loaded.find((l) => l.date === today())
    if (todayEntry) {
      setWeight(String(todayEntry.weight_kg))
      if (todayEntry.with_clothes !== null) setWithClothes(todayEntry.with_clothes)
    }

    // Default filter to type of most recent entry that has with_clothes set
    const mostRecent = loaded.find((l) => l.with_clothes !== null)
    if (mostRecent) setStatsFilter(mostRecent.with_clothes ? "met" : "zonder")

    setLoading(false)
  }

  function selectLog(l: WeightLog) {
    setEditingId(l.id)
    setDate(l.date)
    setWeight(String(l.weight_kg))
    setWithClothes(l.with_clothes ?? true)
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
  }

  function cancelEdit() {
    setEditingId(null)
    setDate(today())
    const todayEntry = logs.find((l) => l.date === today())
    setWeight(todayEntry ? String(todayEntry.weight_kg) : "")
    setWithClothes(todayEntry?.with_clothes ?? true)
  }

  async function saveWeight() {
    if (!weight || isNaN(Number(weight))) return
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("weight_logs").upsert(
      {
        user_id: user.id,
        date,
        weight_kg: Number(weight),
        with_clothes: withClothes,
      },
      { onConflict: "user_id,date" }
    )

    setSaving(false)
    setEditingId(null)
    loadLogs()
  }

  const filteredLogs = logs.filter((l) =>
    l.with_clothes === null ? false : l.with_clothes === (statsFilter === "met")
  )

  const chartData = [...filteredLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((l) => ({
      date: new Date(l.date).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
      }),
      weight: Number(l.weight_kg),
    }))

  const latest = filteredLogs[0]?.weight_kg
  const prev = filteredLogs[1]?.weight_kg
  const diff = latest && prev ? Number(latest) - Number(prev) : null
  const monthAvg =
    filteredLogs.slice(0, 30).length > 0
      ? filteredLogs.slice(0, 30).reduce((s, l) => s + Number(l.weight_kg), 0) /
        Math.min(30, filteredLogs.length)
      : null

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Scale size={20} className="text-neutral-400" /> Gewicht Tracker
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5">Bulk doel: 3549 kcal/dag</p>
      </div>

      {/* Filter toggle */}
      {!loading && logs.some((l) => l.with_clothes !== null) && (
        <div className="flex rounded-lg overflow-hidden border border-white/[0.08] mb-4">
          <button
            onClick={() => setStatsFilter("zonder")}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              statsFilter === "zonder"
                ? "bg-white/10 text-white"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Zonder kleren
          </button>
          <button
            onClick={() => setStatsFilter("met")}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              statsFilter === "met"
                ? "bg-white/10 text-white"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Met kleren
          </button>
        </div>
      )}

      {/* Stats */}
      {!loading && filteredLogs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Card className="p-4">
            <div className="text-xs text-neutral-500 mb-1">Huidig</div>
            <div className="text-xl font-bold text-white">
              {latest ? `${latest}kg` : "—"}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-neutral-500 mb-1">Verschil</div>
            <div
              className={`text-xl font-bold flex items-center gap-1 ${
                diff === null
                  ? "text-neutral-500"
                  : diff > 0
                  ? "text-green-400"
                  : diff < 0
                  ? "text-red-400"
                  : "text-neutral-400"
              }`}
            >
              {diff === null ? (
                "—"
              ) : (
                <>
                  {diff > 0 ? (
                    <TrendingUp size={16} />
                  ) : diff < 0 ? (
                    <TrendingDown size={16} />
                  ) : (
                    <Minus size={16} />
                  )}
                  {diff > 0 ? "+" : ""}
                  {diff.toFixed(1)}kg
                </>
              )}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-neutral-500 mb-1">Gemiddeld</div>
            <div className="text-xl font-bold text-white">
              {monthAvg ? `${monthAvg.toFixed(1)}kg` : "—"}
            </div>
          </Card>
        </div>
      )}

      {/* Chart */}
      {!loading && filteredLogs.length > 0 && chartData.length >= 2 && (
        <Card className="mb-5 p-4">
          <div className="text-xs text-neutral-500 mb-3">Verloop (30 dagen)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#737373", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "#737373", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#fff",
                }}
                formatter={(v) => [`${v} kg`, "Gewicht"]}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#a3a3a3"
                strokeWidth={2}
                dot={{ fill: "#a3a3a3", r: 2 }}
                activeDot={{ r: 5, fill: "#f97316" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Log form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{editingId ? "Aanpassen" : "Gewicht loggen"}</CardTitle>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Datum</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">Gewicht (kg)</label>
              <Input
                type="number"
                placeholder="75.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                step={0.1}
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5">Kleding</label>
            <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setWithClothes(false)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  !withClothes
                    ? "bg-white/10 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Zonder kleren
              </button>
              <button
                type="button"
                onClick={() => setWithClothes(true)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  withClothes
                    ? "bg-white/10 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Met kleren
              </button>
            </div>
          </div>
          <Button
            onClick={saveWeight}
            disabled={saving || !weight}
            className="w-full"
          >
            {saving ? "Opslaan..." : editingId ? <><Pencil size={14} /> Aanpassen</> : <><Plus size={14} /> Opslaan</>}
          </Button>
        </CardContent>
      </Card>

      {/* Recent list */}
      {!loading && logs.length > 0 && (
        <div className="mt-5">
          <h2 className="text-xs text-neutral-500 uppercase tracking-widest mb-3">
            Recente logs
          </h2>
          <div className="space-y-1.5">
            {logs.map((l) => (
              <button
                key={l.id}
                onClick={() => selectLog(l)}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 transition-colors text-left group ${
                  editingId === l.id
                    ? "bg-white/[0.06] border-white/[0.15]"
                    : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.10]"
                }`}
              >
                <span className="text-xs text-neutral-500">{formatDate(l.date)}</span>
                <div className="flex items-center gap-2">
                  {l.with_clothes !== null && (
                    <span className="text-xs text-neutral-600">
                      {l.with_clothes ? "met kleren" : "zonder"}
                    </span>
                  )}
                  <span className="text-sm font-medium text-white">{l.weight_kg} kg</span>
                  <Pencil size={11} className="text-neutral-700 group-hover:text-neutral-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
