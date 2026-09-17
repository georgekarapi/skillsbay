import { memo, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Check, Copy, Terminal } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getMarketplaceSkills } from "@/lib/marketplace-api"
import { CommandText } from "@/components/molecules/command-text"

const FALLBACK_SKILLS = [
  { slug: "thegraph/substreams-deployer", label: "substreams-deployer", price: "0.25 USDC", fallback: true },
  { slug: "defi/audited-automation", label: "audited-automation", price: "0.80 USDC", fallback: true },
  { slug: "openai/evals-rig", label: "evals-rig", price: "0.35 USDC", fallback: true },
]

function HeroTerminalCard({
  skills,
}: {
  skills: Array<{ slug: string; label: string; price: string; fallback?: boolean }>
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [copied, setCopied] = useState(false)

  // Separate "displayed" skill that only swaps after the exit animation
  const [displayedSkill, setDisplayedSkill] = useState(
    () => skills[0] ?? FALLBACK_SKILLS[0]
  )
  const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle")

  const activeSkill = skills[selectedIndex % skills.length] ?? skills[0] ?? FALLBACK_SKILLS[0]
  const command = `npx skillsbay add ${displayedSkill.slug}${displayedSkill.fallback ? " --fallback" : ""}`

  // When selectedIndex changes, run exit → swap → enter
  useEffect(() => {
    if (activeSkill.slug === displayedSkill.slug) return

    setPhase("exit")
    const exitTimer = window.setTimeout(() => {
      setDisplayedSkill(activeSkill)
      setPhase("enter")
      const enterTimer = window.setTimeout(() => setPhase("idle"), 700)
      return () => window.clearTimeout(enterTimer)
    }, 300)

    return () => window.clearTimeout(exitTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSkill.slug])

  // Sync initial displayed skill when skills load
  useEffect(() => {
    if (skills.length > 0 && phase === "idle") {
      setDisplayedSkill(skills[0] ?? FALLBACK_SKILLS[0])
    }
  // only on first skills load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills.length])

  // Cycle package selection every 3.5s unless hovered or just copied
  useEffect(() => {
    if (isPaused || copied || skills.length <= 1) return
    const timer = window.setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % skills.length)
    }, 3500)
    return () => window.clearInterval(timer)
  }, [isPaused, copied, skills.length])

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      toast.success("Install command copied to clipboard")
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Could not copy the command")
    }
  }

  const commandPhaseClass =
    phase === "exit"
      ? "terminal-cmd-exit"
      : phase === "enter"
        ? "terminal-cmd-enter"
        : ""

  return (
    <div
      className="w-full transform-gpu"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="group relative rounded-xl border border-border/80 bg-card/95 p-4 shadow-sm transition-all hover:border-border hover:shadow-md sm:p-5">
        {/* Terminal Window Header */}
        <div className="mb-3.5 flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2" aria-hidden="true">
              <div className="size-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/50 shadow-xs" />
              <div className="size-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/50 shadow-xs" />
              <div className="size-3 rounded-full bg-[#27c93f] border border-[#1aab29]/50 shadow-xs" />
            </div>
            <div className="ml-2 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Terminal className="size-3" />
              <span>terminal</span>
            </div>
          </div>

          {/* Header Copy Button */}
          <button
            type="button"
            onClick={copyCommand}
            aria-label="Copy install command"
            className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2.5 py-1 font-mono text-[11px] font-medium text-foreground transition-all hover:bg-muted active:scale-95"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span className="text-emerald-500 font-medium">copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3 text-muted-foreground" />
                <span>copy</span>
              </>
            )}
          </button>
        </div>

        {/* Skill Preset Tabs with auto-cycling */}
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
          {skills.map((item, index) => {
            const isActive = index === (selectedIndex % skills.length)
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`shrink-0 rounded-md px-2.5 py-1 font-mono transition-colors duration-150 ${
                  isActive
                    ? "bg-primary/10 font-medium text-primary border border-primary/25 shadow-2xs"
                    : "border border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Code Block Display */}
        <div
          onClick={copyCommand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              copyCommand()
            }
          }}
          className="cursor-pointer rounded-lg border border-border/70 bg-muted/40 p-3.5 font-mono text-xs transition-colors hover:border-primary/40 hover:bg-muted/60"
        >
          <div className="flex min-w-0 items-center justify-between gap-2 py-0.5">
            <div className={`flex min-w-0 items-center gap-2 ${commandPhaseClass}`}>
              <span className="shrink-0 select-none text-muted-foreground/60 font-mono">$</span>
              <span className="shrink-0 text-foreground font-mono"><CommandText text="npx skillsbay add" /></span>
              <div className="flex min-w-0 items-center">
                <span className="block truncate font-semibold text-primary font-mono" title={displayedSkill.slug}>
                  {displayedSkill.slug}
                </span>
                {displayedSkill.fallback && (
                  <span className="ml-2 shrink-0 text-muted-foreground font-mono">--fallback</span>
                )}
                <span
                  aria-hidden="true"
                  className="ml-1 inline-block h-3.5 w-1.5 shrink-0 animate-pulse bg-primary/70 align-middle"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Output simulation / Trust line */}
        <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <Check className="size-3" />
            Purchase receipt verified onchain
          </span>
          <span
            className={`inline-block rounded bg-muted/50 px-1.5 py-0.5 text-foreground/80 font-medium ${commandPhaseClass}`}
          >
            {displayedSkill.price}
          </span>
        </div>
      </div>
    </div>
  )
}


export const HeroSection = memo(function HeroSection() {
  const marketplace = useQuery({ queryKey: ["marketplace-skills"], queryFn: getMarketplaceSkills })
  const skillsData = marketplace.data?.skills
  const skills = useMemo(() => {
    if (skillsData && skillsData.length > 0) {
      return [...skillsData]
        .sort((a, b) => b.paidInstalls - a.paidInstalls)
        .slice(0, 3)
        .map((item) => ({
          slug: item.id,
          label: item.slug,
          price: `${item.priceUsdc} USDC`,
        }))
    }
    return FALLBACK_SKILLS
  }, [skillsData])

  return (
    <section className="relative mb-6 border-b pb-7 pt-1 sm:mb-8 sm:pb-8 sm:pt-2">
      {/* Subtle ambient radial lighting with GPU layer promotion */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-80 w-full max-w-5xl -translate-x-1/2 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,oklch(var(--primary)/0.12),transparent)] blur-2xl transform-gpu will-change-transform"
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
        {/* Left Column: Value proposition & CTAs */}
        <div className="flex flex-col items-start">
          {/* Primary Headline with deliberate editorial line break */}
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
            <span>Trusted paid skills.</span>{" "}
            <span className="block text-muted-foreground font-normal">
              Installed where your agent works.
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[15px]">
            Buy versioned private bundles, verify the purchase, and install the
            unlocked skill directly into your project workspace.
          </p>

          {/* Actions Row */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild className="h-10 gap-2 px-5 text-sm font-medium shadow-xs">
              <Link to="/dashboard/skills/new">
                Publish a skill
              </Link>
            </Button>
          </div>

          {/* Key Guarantees */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-primary" />
              Versioned private bundles
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-primary" />
              Project-scoped installs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-primary" />
              On-chain proof of purchase
            </span>
          </div>
        </div>

        {/* Right Column: Minimalist CLI Terminal Card */}
        <HeroTerminalCard skills={skills} />
      </div>
    </section>
  )
})
