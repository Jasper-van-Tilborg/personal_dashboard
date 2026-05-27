"use client"

import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"

const DASHBOARD_EMAIL = process.env.NEXT_PUBLIC_DASHBOARD_EMAIL ?? "me@dashboard.local"

export function LoginForm() {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: DASHBOARD_EMAIL,
        password,
      })

      if (error) {
        setError("Ongeldig wachtwoord")
        setLoading(false)
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("Er ging iets mis. Probeer opnieuw.")
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">
            Wachtwoord
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              autoFocus
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <Button type="submit" disabled={loading || !password} className="w-full" size="lg">
          {loading ? "Inloggen..." : "Inloggen"}
        </Button>
      </form>
    </div>
  )
}
