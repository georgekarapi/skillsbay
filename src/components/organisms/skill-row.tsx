import { memo } from "react"
import { ArrowUpRight, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"
import { PriceBadge } from "@/components/molecules/price-badge"
import type { Skill } from "@/types/marketplace"

export const SkillRow = memo(function SkillRow({ skill }: { skill: Skill }) {
  return (
    <Link
      to={`/${skill.namespace}/${skill.slug}`}
      className="group grid gap-3 border-b px-3 py-4 transition-colors hover:bg-muted/55 sm:grid-cols-[2.25rem_minmax(0,1fr)_7rem_6.5rem_5rem] sm:items-center sm:px-5"
    >
      <span className="hidden font-mono text-xs text-muted-foreground sm:block">
        {String(skill.rank).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-medium group-hover:text-primary">{skill.title}</h3>
          {skill.featured && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium group-hover:text-primary">
              featured
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {skill.namespace}/{skill.slug} · {skill.author}
        </p>
      </div>
      <div className="flex items-center gap-2 sm:block">
        <PriceBadge price={skill.priceUsdc} />
        <span className="ml-auto text-xs text-muted-foreground sm:hidden">
          {skill.paidInstalls.toLocaleString()} installs
        </span>
      </div>
      <div className="hidden text-right sm:block">
        <p className="font-mono text-xs tabular-nums">{skill.paidInstalls.toLocaleString()}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">paid installs</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="size-3" />+{skill.trend}%
        <ArrowUpRight className="ml-auto size-3 text-muted-foreground sm:hidden" />
      </div>
    </Link>
  )
})
