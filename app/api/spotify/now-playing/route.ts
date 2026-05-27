import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

async function refreshToken(
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) return null
  const data = await res.json()

  const supabase = await createClient()
  await supabase
    .from("spotify_tokens")
    .update({
      access_token: data.access_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  return data.access_token
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: tokenData } = await supabase
    .from("spotify_tokens")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!tokenData) return NextResponse.json({ connected: false })

  let accessToken = tokenData.access_token

  // Refresh if expiring soon (within 60 seconds)
  if (new Date(tokenData.expires_at).getTime() - Date.now() < 60000) {
    const newToken = await refreshToken(user.id, tokenData.refresh_token)
    if (!newToken) return NextResponse.json({ error: "Token refresh failed" }, { status: 401 })
    accessToken = newToken
  }

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 204 || res.status === 404) {
    return NextResponse.json({ connected: true, playing: false })
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Spotify API error" }, { status: res.status })
  }

  const data = await res.json()

  return NextResponse.json({
    connected: true,
    playing: data.is_playing,
    track: {
      name: data.item?.name,
      artist: data.item?.artists?.map((a: any) => a.name).join(", "),
      album: data.item?.album?.name,
      albumArt: data.item?.album?.images?.[1]?.url ?? data.item?.album?.images?.[0]?.url,
      duration_ms: data.item?.duration_ms,
      progress_ms: data.progress_ms,
      spotifyUrl: data.item?.external_urls?.spotify,
    },
  })
}
