import { HeroSection } from "@/components/organisms/hero-section"
import { SkillLeaderboard } from "@/components/organisms/skill-leaderboard"
import { MarketplaceShell } from "@/components/templates/marketplace-shell"

export function MarketplacePage() {
  return (
    <MarketplaceShell>
      <HeroSection />
      <div id="marketplace" className="mb-5 scroll-mt-20">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Marketplace</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">Skills agents are installing now</h2>
      </div>

      <SkillLeaderboard />
    </MarketplaceShell>
  )
}

