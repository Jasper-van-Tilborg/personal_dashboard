import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "outline"
  size?: "sm" | "md" | "lg" | "icon"
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none rounded-xl cursor-pointer",
        variant === "primary" &&
          "bg-orange-500 hover:bg-orange-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)] hover:shadow-[0_0_20px_rgba(249,115,22,0.35)]",
        variant === "ghost" &&
          "bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10",
        variant === "danger" &&
          "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20",
        variant === "outline" &&
          "border border-orange-500/40 text-orange-400 hover:bg-orange-500/10",
        size === "sm" && "text-xs px-3 py-1.5 gap-1.5",
        size === "md" && "text-sm px-4 py-2 gap-2",
        size === "lg" && "text-base px-6 py-3 gap-2.5",
        size === "icon" && "p-2 w-8 h-8",
        className
      )}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button }
