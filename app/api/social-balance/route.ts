import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key")
  if (!process.env.BALANCE_API_KEY || key !== process.env.BALANCE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = process.env.DASHBOARD_USER_ID
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!userId || !serviceKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false } }
  )

  const today = new Date().toLocaleDateString("en-CA") // YYYY-MM-DD

  const { data, error } = await supabase
    .from("social_media_transactions")
    .select("minutes, source, description")
    .eq("user_id", userId)
    .eq("date", today)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const txs = data ?? []
  const earned = txs.filter((t) => t.minutes > 0).reduce((s, t) => s + t.minutes, 0)
  const used = Math.abs(txs.filter((t) => t.minutes < 0).reduce((s, t) => s + t.minutes, 0))
  const available = Math.max(0, earned - used)

  return NextResponse.json({
    available,
    earned,
    used,
    date: today,
    breakdown: txs
      .filter((t) => t.minutes > 0)
      .map((t) => ({ source: t.source, minutes: t.minutes, description: t.description })),
  })
}
