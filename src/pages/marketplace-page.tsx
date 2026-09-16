import { useEffect, useState } from "react"
import { usePageSeo } from "@/hooks/use-page-seo"
import { HeroSection } from "@/components/organisms/hero-section"
import { SkillLeaderboard, type SkillTab } from "@/components/organisms/skill-leaderboard"
import { MarketplaceShell } from "@/components/templates/marketplace-shell"

const TAB_TITLES: Record<SkillTab, string> = {
  trending: "Trending",
  top: "Top",
  new: "New",
}

function AnimatedWord({ word }: { word: string }) {
  const [current, setCurrent] = useState(word)
  const [prev, setPrev] = useState<string | null>(null)

  if (word !== current) {
    setPrev(current)
    setCurrent(word)
  }

  useEffect(() => {
    if (!prev) return
    const timer = setTimeout(() => {
      setPrev(null)
    }, 300)
    return () => clearTimeout(timer)
  }, [prev])

  return (
    <span className="relative inline-flex h-7 items-center overflow-hidden font-semibold text-primary">
      {prev && (
        <span
          key={`prev-${prev}`}
          aria-hidden="true"
          className="absolute inset-0 flex items-center animate-slide-up-out whitespace-nowrap will-change-transform"
        >
          {prev}
        </span>
      )}
      <span
        key={`curr-${current}`}
        className={`inline-flex items-center whitespace-nowrap will-change-transform ${
          prev ? "animate-slide-up-in" : ""
        }`}
      >
        {current}
      </span>
    </span>
  )
}

export function MarketplacePage() {
  const [tab, setTab] = useState<SkillTab>("trending")

  usePageSeo({
    title: "Skillsbay — Trusted Paid Agent Skills",
    description: "Buy versioned private skills, verify the purchase on-chain, and install the unlocked release directly into your agent workspace.",
    canonical: "/",
    ogType: "website",
  })

  return (
    <MarketplaceShell>
      <HeroSection />
      <div id="marketplace" className="mb-5 scroll-mt-20">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Marketplace</p>
        <h2 className="mt-1 flex items-center text-xl font-semibold tracking-tight">
          <AnimatedWord word={TAB_TITLES[tab]} />
          <span className="ml-1.5 text-foreground">skills now</span>
        </h2>
      </div>

      <SkillLeaderboard tab={tab} onTabChange={setTab} />
    </MarketplaceShell>
  )
}
