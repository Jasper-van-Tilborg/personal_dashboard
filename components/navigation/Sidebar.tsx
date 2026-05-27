"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Dumbbell,
  CheckSquare,
  Moon,
  Scale,
  BookOpen,
  Calendar,
  Clock,
  Trophy,
  CloudSun,
  Music2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/gym", icon: Dumbbell, label: "Gym" },
  { href: "/habits", icon: CheckSquare, label: "Habits" },
  { href: "/sleep", icon: Moon, label: "Slaap" },
  { href: "/weight", icon: Scale, label: "Gewicht" },
  { href: "/journal", icon: BookOpen, label: "Journal" },
  { href: "/weekschema", icon: Calendar, label: "Weekschema" },
  { href: "/social-timer", icon: Clock, label: "Social Timer" },
  { href: "/motivatie", icon: Trophy, label: "Motivatie" },
  { href: "/weer", icon: CloudSun, label: "Weer" },
  { href: "/spotify", icon: Music2, label: "Spotify" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0 shrink-0",
        "border-r border-white/[0.06] bg-white/[0.015]",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-52"
      )}
    >
      <div
        className={cn(
          "flex items-center h-14 border-b border-white/[0.06] px-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <span className="text-sm font-bold text-white tracking-wide pl-1">
            ⚡ Dashboard
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-neutral-600 hover:text-white hover:bg-white/10 transition-colors"
          title={collapsed ? "Uitklappen" : "Inklappen"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                isActive
                  ? "bg-orange-500/15 text-orange-400 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.15)]"
                  : "text-neutral-500 hover:text-white hover:bg-white/[0.05]",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
