import { memo, useState } from "react"
import { ArrowUpRight, Check, Copy, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { PriceBadge } from "@/components/molecules/price-badge"
import type { Skill } from "@/types/marketplace"

function formatInstallCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toLocaleString()
}

export const SkillRow = memo(function SkillRow({ skill, displayRank }: { skill: Skill; displayRank: number }) {
  const [copied, setCopied] = useState(false)
  const isImported = skill.source === "skills.sh"
  const cliCommand = `npx skillsbay add ${skill.author}/${skill.slug} --fallback`

  const handleImportedClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(cliCommand)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = cliCommand
        textarea.setAttribute("readonly", "")
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopied(true)
      toast.success("Install command copied", { description: cliCommand })
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Could not copy the command")
    }
  }

  const content = (
    <>
      <span className="hidden font-mono text-xs text-muted-foreground sm:block">
        {String(displayRank).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-medium group-hover:text-primary">{skill.title}</h3>
          {isImported && (
            <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
              Imported
            </span>
          )}
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
          {formatInstallCount(skill.paidInstalls)} installs
        </span>
      </div>
      <div className="hidden text-right sm:block">
        <p className="font-mono text-xs tabular-nums">{formatInstallCount(skill.paidInstalls)}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{isImported ? "free installs" : "paid installs"}</p>
      </div>
      <div className="flex items-center gap-1 text-xs">
        {isImported ? (
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "copied" : "copy cli"}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="size-3" />+{skill.trend}%
          </span>
        )}
        <ArrowUpRight className="ml-auto size-3 text-muted-foreground sm:hidden" />
      </div>
    </>
  )

  if (isImported) {
    return (
      <button
        type="button"
        onClick={handleImportedClick}
        className="group grid w-full cursor-pointer gap-3 border-b px-3 py-4 text-left transition-colors hover:bg-muted/55 sm:grid-cols-[2.25rem_minmax(0,1fr)_7rem_6.5rem_5rem] sm:items-center sm:px-5"
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      to={`/${skill.namespace}/${skill.slug}`}
      className="group grid gap-3 border-b px-3 py-4 transition-colors hover:bg-muted/55 sm:grid-cols-[2.25rem_minmax(0,1fr)_7rem_6.5rem_5rem] sm:items-center sm:px-5"
    >
      {content}
    </Link>
  )
})
