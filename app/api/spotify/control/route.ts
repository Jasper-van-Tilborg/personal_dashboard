import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { action } = await request.json()

  const { data: tokenData } = await supabase
    .from("spotify_tokens")
    .select("access_token")
    .eq("user_id", user.id)
    .single()

  if (!tokenData) return NextResponse.json({ error: "Not connected" }, { status: 400 })

  const ENDPOINTS: Record<string, { url: string; method: string }> = {
    play: { url: "https://api.spotify.com/v1/me/player/play", method: "PUT" },
    pause: { url: "https://api.spotify.com/v1/me/player/pause", method: "PUT" },
    next: { url: "https://api.spotify.com/v1/me/player/next", method: "POST" },
    previous: { url: "https://api.spotify.com/v1/me/player/previous", method: "POST" },
  }

  const endpoint = ENDPOINTS[action]
  if (!endpoint) return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  const res = await fetch(endpoint.url, {
    method: endpoint.method,
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  return NextResponse.json({ ok: res.ok })
}
