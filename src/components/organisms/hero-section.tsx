import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Check, Copy, Terminal } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

const SAMPLE_SKILLS = [
  { slug: "thegraph/substreams-deployer", label: "substreams-deployer", price: "0.25 USDC" },
  { slug: "defi/audited-automation", label: "audited-automation", price: "0.80 USDC" },
  { slug: "solidity/incident-response", label: "incident-response", price: "1.20 USDC" },
]

export function HeroSection() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [copied, setCopied] = useState(false)

  const activeSkill = SAMPLE_SKILLS[selectedIndex]
  const command = `npx skillsbay add ${activeSkill.slug}`

  // Cycle package selection every 3.5s unless hovered or just copied
  useEffect(() => {
    if (isPaused || copied) return
    const timer = window.setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % SAMPLE_SKILLS.length)
    }, 3500)
    return () => window.clearInterval(timer)
  }, [isPaused, copied])

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


  const scrollToMarketplace = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = document.getElementById("marketplace")
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <section className="relative mb-6 border-b pb-7 pt-1 sm:mb-8 sm:pb-8 sm:pt-2">
      {/* Subtle ambient radial lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-80 w-full max-w-5xl -translate-x-1/2 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,oklch(var(--primary)/0.12),transparent)] blur-2xl"
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
        {/* Left Column: Value proposition & CTAs */}
        <div className="flex flex-col items-start">
          {/* Primary Headline with deliberate editorial line break */}
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
            <span>The paid skills registry</span>{" "}
            <span className="block text-muted-foreground font-normal">
              for capable agents.
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[15px]">
            Discover battle-tested workflows and tools. Pay once with USDC,
            verify on-chain receipts, and run capabilities seamlessly across your agent fleet.
          </p>

          {/* Actions Row */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="default" className="gap-2 px-4 shadow-xs">
              <a href="#marketplace" onClick={scrollToMarketplace}>
                Explore Skills
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>

            <Button asChild variant="outline" size="default" className="px-4">
              <Link to="/dashboard/skills/new">
                Publish a skill
              </Link>
            </Button>
          </div>

          {/* Key Guarantees */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-primary" />
              One-time USDC unlock
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-primary" />
              Zero-config CLI
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-primary" />
              Verifiable proof of purchase
            </span>
          </div>
        </div>

        {/* Right Column: Minimalist CLI Terminal Card */}
        <div
          className="w-full"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="group relative rounded-xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-xs transition-all hover:border-border hover:shadow-md sm:p-5">
            {/* Terminal Window Header */}
            <div className="mb-3.5 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <div className="size-2.5 rounded-full bg-muted-foreground/25" />
                  <div className="size-2.5 rounded-full bg-muted-foreground/25" />
                  <div className="size-2.5 rounded-full bg-muted-foreground/25" />
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
              {SAMPLE_SKILLS.map((item, index) => {
                const isActive = index === selectedIndex
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={`shrink-0 rounded-md px-2.5 py-1 font-mono transition-all duration-200 ${
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
              className="cursor-pointer rounded-lg border border-border/70 bg-muted/40 p-3.5 font-mono text-xs transition-all hover:border-primary/40 hover:bg-muted/60"
            >
              <div className="flex items-center justify-between gap-2 overflow-x-auto py-0.5">
                <div className="flex items-center gap-2">
                  <span className="select-none text-muted-foreground/60 font-mono">$</span>
                  <span className="text-foreground font-mono">npx skillsbay add</span>
                  <span className="font-semibold text-primary font-mono">
                    {activeSkill.slug}
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-block h-3.5 w-1.5 animate-pulse bg-primary/70 align-middle"
                  />
                </div>
              </div>
            </div>

            {/* Output simulation / Trust line */}
            <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="size-3" />
                Receipt verified onchain
              </span>
              <span className="rounded bg-muted/50 px-1.5 py-0.5 text-foreground/80 font-medium">
                {activeSkill.price}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

