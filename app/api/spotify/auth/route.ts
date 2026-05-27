import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Spotify credentials not configured" },
      { status: 500 }
    )
  }

  const scopes = [
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-modify-playback-state",
  ].join(" ")

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    show_dialog: "false",
  })

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`
  )
}
