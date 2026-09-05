import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

export function MetricCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <Card size="sm"><CardContent className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</span></CardContent></Card>
}
