import { cn } from "cn"

export function StatusDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-1.5 rounded-full bg-emerald-500", className)} />
}
