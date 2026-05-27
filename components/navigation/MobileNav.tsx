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
  MoreHorizontal,
  X,
} from "lucide-react"
import { useState } from "react"

const primaryItems = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/gym", icon: Dumbbell, label: "Gym" },
  { href: "/habits", icon: CheckSquare, label: "Habits" },
  { href: "/social-timer", icon: Clock, label: "Timer" },
]

const moreItems = [
  { href: "/sleep", icon: Moon, label: "Slaap" },
  { href: "/weight", icon: Scale, label: "Gewicht" },
  { href: "/journal", icon: BookOpen, label: "Journal" },
  { href: "/weekschema", icon: Calendar, label: "Weekschema" },
  { href: "/motivatie", icon: Trophy, label: "Motivatie" },
  { href: "/weer", icon: CloudSun, label: "Weer" },
  { href: "/spotify", icon: Music2, label: "Spotify" },
]

export function MobileNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  const isMoreActive = moreItems.some((i) => pathname.startsWith(i.href))

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          <div className="absolute bottom-16 left-0 right-0 bg-[#111] border-t border-white/[0.08] p-4 rounded-t-2xl">
            <div className="grid grid-cols-4 gap-2">
              {moreItems.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors",
                    pathname.startsWith(href)
                      ? "bg-orange-500/15 text-orange-400"
                      : "text-neutral-400 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={20} />
                  <span className="text-[10px]">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur-md safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {primaryItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all min-w-[56px]",
                  isActive ? "text-orange-400" : "text-neutral-500"
                )}
              >
                <Icon size={20} />
                <span className="text-[10px]">{label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all min-w-[56px]",
              showMore || isMoreActive ? "text-orange-400" : "text-neutral-500"
            )}
          >
            {showMore ? <X size={20} /> : <MoreHorizontal size={20} />}
            <span className="text-[10px]">Meer</span>
          </button>
        </div>
      </nav>
    </>
  )
}
