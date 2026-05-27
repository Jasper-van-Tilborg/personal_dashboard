import { cn } from "@/lib/utils"
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react"

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white",
        "placeholder:text-neutral-600",
        "focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/40",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors duration-150",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"

const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-sm text-white",
      "placeholder:text-neutral-600 resize-none",
      "focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/40",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "transition-colors duration-150",
      className
    )}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export { Input, Textarea }
