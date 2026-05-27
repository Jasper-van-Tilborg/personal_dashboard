import { LoginForm } from "@/components/auth/LoginForm"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect("/")

  return (
    <div className="flex min-h-dvh items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4 shadow-[0_0_25px_rgba(249,115,22,0.15)]">
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Welkom terug
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
