import { Sidebar } from "@/components/navigation/Sidebar"
import { MobileNav } from "@/components/navigation/MobileNav"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="flex min-h-dvh bg-[#0a0a0a]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">{children}</main>
      <MobileNav />
    </div>
  )
}
