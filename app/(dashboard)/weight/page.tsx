"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WeightLog } from "@/types/database"
import { today, formatDate } from "@/lib/utils"
import { Scale, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react"
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
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState("")
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

    setLogs(data ?? [])

    const todayEntry = (data ?? []).find((l) => l.date === today())
    if (todayEntry) setWeight(String(todayEntry.weight_kg))

    setLoading(false)
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
      },
      { onConflict: "user_id,date" }
    )

    setSaving(false)
    loadLogs()
  }

  const chartData = [...logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((l) => ({
      date: new Date(l.date).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
      }),
      weight: Number(l.weight_kg),
    }))

  const latest = logs[0]?.weight_kg
  const prev = logs[1]?.weight_kg
  const diff = latest && prev ? Number(latest) - Number(prev) : null
  const monthAvg =
    logs.slice(0, 30).length > 0
      ? logs.slice(0, 30).reduce((s, l) => s + Number(l.weight_kg), 0) /
        Math.min(30, logs.length)
      : null

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Scale size={20} className="text-neutral-400" /> Gewicht Tracker
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5">Bulk doel: 3549 kcal/dag</p>
      </div>

      {/* Stats */}
      {!loading && logs.length > 0 && (
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
      {!loading && chartData.length >= 2 && (
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
          <CardTitle>Gewicht loggen</CardTitle>
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
          <Button
            onClick={saveWeight}
            disabled={saving || !weight}
            className="w-full"
          >
            {saving ? "Opslaan..." : <><Plus size={14} /> Opslaan</>}
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
            {logs.slice(0, 7).map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.05] px-4 py-2.5"
              >
                <span className="text-xs text-neutral-500">{formatDate(l.date)}</span>
                <span className="text-sm font-medium text-white">{l.weight_kg} kg</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
