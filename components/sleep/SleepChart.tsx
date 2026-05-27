"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts"
import type { SleepLog } from "@/types/database"

interface Props {
  logs: SleepLog[]
}

export function SleepChart({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-neutral-600 text-sm">
        Nog geen slaapdata
      </div>
    )
  }

  const data = [...logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((l) => ({
      date: new Date(l.date).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
      }),
      hours: +(l.duration_minutes / 60).toFixed(1),
      good: l.duration_minutes >= 420,
    }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
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
          domain={[0, 10]}
        />
        <Tooltip
          contentStyle={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#fff",
          }}
          formatter={(v) => [`${v}u`, "Slaap"]}
        />
        <ReferenceLine
          y={7}
          stroke="rgba(34,197,94,0.3)"
          strokeDasharray="4 4"
          label={{ value: "7u", fill: "#4ade80", fontSize: 9, position: "insideTopRight" }}
        />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.good ? "#22c55e" : "#f97316"}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
