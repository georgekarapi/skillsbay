import { ArrowRight, ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { CommandCopy } from "@/components/molecules/command-copy"
import { SkillLeaderboard } from "@/components/organisms/skill-leaderboard"
import { MarketplaceShell } from "@/components/templates/marketplace-shell"

export function MarketplacePage() {
  return <MarketplaceShell><section className="mb-10 grid gap-6 border-b pb-10 md:grid-cols-[minmax(0,1fr)_20rem] md:items-end"><div><div className="mb-3 flex items-center gap-2 text-xs font-medium text-primary"><ShieldCheck className="size-3.5" /> Indexed purchase receipts · Base Sepolia</div><h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">The paid skills registry for capable agents.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Discover proven agent workflows, pay once with USDC, and install them where your agent already works.</p></div><div className="grid gap-3"><CommandCopy command="npx skillsbay add thegraph/substreams-deployer" /><Link to="/dashboard/skills/new" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Publish your first skill <ArrowRight className="size-3.5" /></Link></div></section><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Marketplace</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Skills agents are installing now</h2></div><p className="hidden text-xs text-muted-foreground sm:block">Purchase receipts indexed on The Graph</p></div><SkillLeaderboard /></MarketplaceShell>
}
