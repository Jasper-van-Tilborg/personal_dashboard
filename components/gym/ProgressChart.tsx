"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

interface DataPoint {
  date: string
  weight: number
}

export function ProgressChart({ data }: { data: DataPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-neutral-600 text-sm">
        Minimaal 2 datapunten nodig voor een grafiek
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#737373", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "#737373", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#fff",
          }}
          formatter={(v) => [`${v} kg`, "Max gewicht"]}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ fill: "#f97316", r: 3 }}
          activeDot={{ r: 5, fill: "#f97316" }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
